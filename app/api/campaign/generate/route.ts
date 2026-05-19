import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { buildSystemPrompt, type Mode } from "@/lib/prompts";
import { chat } from "@/lib/claude";
import { generateImages } from "@/lib/ideogram";
import { limits } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // Optional user nudge: "make it about new launch", "festival flavor", etc.
  brief: z.string().max(500).optional(),
  mode: z.enum(["coach", "strategy", "create"]).default("create"),
});

// Cost per campaign (text-only for now; Day 10 will add image cost).
const CREDITS_PER_CAMPAIGN = 1;

const TASK_INSTRUCTION = `You are now generating a single ready-to-post daily marketing task for the brand profile above.

Output STRICTLY valid JSON only — no prose before or after, no markdown fences. The shape is:

{
  "platform": "Instagram | Facebook | YouTube Shorts | WhatsApp",
  "post_type": "reel | image | carousel | story",
  "best_time": "Exact local time + one-line why (e.g. \\"7:30 PM — peak Surat scroll time on weekdays\\")",
  "idea": "One specific actionable post idea (1-2 sentences).",
  "hook": "First 3 seconds of the script — scroll-stopping.",
  "caption": "Ready-to-copy caption in the user's language. 2-4 short paragraphs separated by blank lines. Include 1-2 emojis where natural.",
  "hashtags": "10-15 relevant hashtags separated by spaces, all lowercase.",
  "why_this_works": "One sentence — city + niche specific.",
  "whatsapp_status": "Short punchy status text (only if WhatsApp is enabled in the brand profile, otherwise empty string).",
  "whatsapp_broadcast": "Direct sales message template (only if WhatsApp is enabled, otherwise empty string).",
  "image_prompt": "A complete Ideogram prompt following the IDEOGRAM PROMPT FORMULA above — single paragraph, includes SCENE, LIGHTING, COLORS, TEXT-Top (max 5 words), TEXT-Middle, TEXT-Bottom (max 4 word CTA), STYLE, FORMAT, QUALITY, MOOD."
}

Rules:
- Use the brand profile's language. If language is Hinglish, mix Hindi + English naturally.
- Use Indian cultural context if country is India.
- Use the local currency for any pricing (₹ for India).
- Hashtags must be relevant to the niche — never generic spam.
- Never invent prices or features that aren't in the brand profile.
- If a brief is provided by the user, weave it into the idea.`;

const TaskSchema = z.object({
  platform: z.string(),
  post_type: z.string(),
  best_time: z.string(),
  idea: z.string(),
  hook: z.string(),
  caption: z.string(),
  hashtags: z.string(),
  why_this_works: z.string(),
  whatsapp_status: z.string().default(""),
  whatsapp_broadcast: z.string().default(""),
  image_prompt: z.string().default(""),
});

function extractJson(text: string): string {
  // Tolerate ```json ... ``` fences and trailing prose.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return candidate.trim();
  return candidate.slice(start, end + 1).trim();
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    // 1) Rate limit (10/hour)
    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Generation limit reached. Try again later.", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    // 2) Validate
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 3) Fetch brand profile
    const sql = getDb();
    const brandRows = await sql`
      SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    const brand = brandRows[0];
    if (!brand?.onboarding_complete) {
      return NextResponse.json(
        { error: "Finish onboarding first." },
        { status: 400 }
      );
    }

    // 4) Plan-aware credit check (free plan has 1 campaign/week limit
    //    handled elsewhere; here we just verify a credit is available
    //    OR the user is on a paid plan with monthly campaigns left).
    //    For now: deduct 1 credit if user has any. Otherwise still allow
    //    on free plan — quota enforcement comes in Day 14 (subscriptions).
    const userRows = await sql`
      SELECT credits, plan FROM users WHERE id = ${user.id} LIMIT 1
    `;
    const u = userRows[0] ?? { credits: 0, plan: "free" };

    let creditsUsed = 0;
    if (u.credits >= CREDITS_PER_CAMPAIGN) {
      const dec = await sql`
        UPDATE users
        SET credits = credits - ${CREDITS_PER_CAMPAIGN}
        WHERE id = ${user.id} AND credits >= ${CREDITS_PER_CAMPAIGN}
        RETURNING credits
      `;
      if (dec.length === 0) {
        return NextResponse.json({ error: "Insufficient credits." }, { status: 402 });
      }
      creditsUsed = CREDITS_PER_CAMPAIGN;
      await sql`
        INSERT INTO credit_transactions (user_id, amount, type, description)
        VALUES (${user.id}, ${-CREDITS_PER_CAMPAIGN}, 'use', 'Campaign generation')
      `;
    }
    // else: free-tier soft path; quota enforcement to come.

    // 5) Build prompt and call Claude
    const system = buildSystemPrompt(brand, parsed.data.mode as Mode);

    const userPayload = parsed.data.brief?.trim()
      ? `User brief: ${parsed.data.brief.trim()}\n\n${TASK_INSTRUCTION}`
      : TASK_INSTRUCTION;

    let task: z.infer<typeof TaskSchema>;
    let modelUsed = "fallback";
    let fallback = false;

    try {
      const r = await chat({
        system,
        messages: [{ role: "user", content: userPayload }],
        model: "sonnet",
        temperature: 0.8,
        maxTokens: 1200,
      });
      modelUsed = r.model;
      const json = extractJson(r.text);
      const obj = JSON.parse(json);
      task = TaskSchema.parse(obj);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const isCreditOrAuth = /402|401|credits|not set|api[_ ]key/i.test(msg);
      if (isCreditOrAuth) {
        // Refund the credit we just used.
        if (creditsUsed > 0) {
          await sql`UPDATE users SET credits = credits + ${creditsUsed} WHERE id = ${user.id}`;
          await sql`
            INSERT INTO credit_transactions (user_id, amount, type, description)
            VALUES (${user.id}, ${creditsUsed}, 'refund', 'Auto-refund: AI unavailable')
          `;
          creditsUsed = 0;
        }
        // Demo task so the UI is testable without funds.
        fallback = true;
        task = demoTask(brand);
      } else {
        if (creditsUsed > 0) {
          await sql`UPDATE users SET credits = credits + ${creditsUsed} WHERE id = ${user.id}`;
          await sql`
            INSERT INTO credit_transactions (user_id, amount, type, description)
            VALUES (${user.id}, ${creditsUsed}, 'refund', 'Auto-refund: generation failed')
          `;
        }
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    // 6) Generate images (3 variations). Falls back to placeholders when
    //    IDEOGRAM_API_KEY is not set so the UI is fully testable.
    const imagePrompt =
      task.image_prompt && task.image_prompt.length > 20
        ? task.image_prompt
        : `A clean professional ad for ${brand.brand_name || "the brand"} — ${task.idea}. Match Indian context if relevant. Format 1080x1350 portrait. Ultra high quality.`;

    const imgs = await generateImages({ prompt: imagePrompt, count: 3 });

    // 7) Persist campaign
    const inserted = await sql`
      INSERT INTO campaigns (
        user_id, caption, hashtags, hook, idea, platform, post_type, best_time,
        why_this_works, whatsapp_status, whatsapp_broadcast, image_urls,
        recommended_image_index, credits_used
      ) VALUES (
        ${user.id}, ${task.caption}, ${task.hashtags}, ${task.hook}, ${task.idea},
        ${task.platform}, ${task.post_type}, ${task.best_time}, ${task.why_this_works},
        ${task.whatsapp_status}, ${task.whatsapp_broadcast}, ${imgs.urls},
        ${0}, ${creditsUsed}
      )
      RETURNING *
    `;

    return NextResponse.json({
      campaign: inserted[0],
      model: modelUsed,
      fallback,
      imageFallback: imgs.fallback,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// Used only when OpenRouter is missing key/credits.
function demoTask(brand: Record<string, unknown>): z.infer<typeof TaskSchema> {
  const product =
    typeof brand.product === "string" && brand.product
      ? brand.product
      : "your product";
  const city =
    typeof brand.city === "string" && brand.city ? brand.city : "your city";
  const waOn = !!brand.whatsapp_enabled;

  return {
    platform: "Instagram",
    post_type: "reel",
    best_time: "7:30 PM — peak local scroll time on weekdays",
    idea: `Show a 30-second behind-the-scenes of how ${product} gets made or packed today.`,
    hook: `"Yeh dekho — har order, hand-checked. Aaj ka order tumhara hoga?"`,
    caption: `Behind every order is a little ritual.\n\nWe pack, we double-check, we add a thank-you note.\n\nTag a friend who'd love this.`,
    hashtags:
      "#smallbusiness #madeinindia #" +
      city.toLowerCase().replace(/\s+/g, "") +
      " #behindthescenes #handmade #d2c #supportlocal #reels #instareels #shopping",
    why_this_works: `Behind-the-scenes reels build trust fast in ${city}'s tier-2 audience.`,
    whatsapp_status: waOn
      ? `New batch ready 📦 DM "yes" to reserve yours.`
      : "",
    whatsapp_broadcast: waOn
      ? `Hi! New stock just dropped 🎉 Limited pieces. Reply with "interested" to see the catalogue.`
      : "",
    image_prompt: `A warm professional ad for ${product} — packing scene. SCENE: hands packing the order on a wooden table. LIGHTING: soft morning daylight. COLORS: cream, brown, deep teal. TEXT — Top: "Made in ${city}". TEXT — Middle: ${product}. TEXT — Bottom: "Order now". STYLE: Professional ad. FORMAT: Portrait 1080x1350. QUALITY: Ultra high quality photo. MOOD: warm, trusted, handmade.`,
  };
}
