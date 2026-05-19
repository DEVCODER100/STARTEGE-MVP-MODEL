import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { buildSystemPrompt, type Mode } from "@/lib/prompts";
import { chat } from "@/lib/claude";
import { generateMarketingImage } from "@/lib/imagegen";
import { extractForcedText } from "@/lib/imageplan";
import { inspect, limits, logSecurityEvent } from "@/lib/security";
import {
  canGeneratePost,
  consumePost,
  canGenerateImage,
  consumeImage,
  getUsage,
  MVP_LIMIT_MESSAGE,
} from "@/lib/usage";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // image pipeline can take ~10-25s

const Body = z.object({
  mode: z.enum(["coach", "strategy", "create"]).default("coach"),
  chatId: z.string().uuid().nullable().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

const FALLBACK_REPLY = `I'm online but my AI brain isn't funded yet — the OpenRouter account needs credits to call Claude.

Add credits at openrouter.ai/settings/credits and ask me again.`;

const JAILBREAK_REPLY = "I can only help you with marketing and business growth.";

function makeTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

// Fast keyword path: an obvious image request.
const IMG_NOUN =
  /\b(image|images|picture|pic|pics|visual|visuals|poster|creative|creatives|graphic|banner|photo|thumbnail|artwork|mockup)\b/i;
const IMG_VERB =
  /\b(make|create|generate|design|need|want|give|build|draw|show|produce)\b/i;
function isImageRequest(text: string): boolean {
  return IMG_NOUN.test(text) && IMG_VERB.test(text);
}

// For everything else (e.g. follow-ups like "make another one", "a better
// version") a tiny Haiku call classifies intent using the conversation.
async function classifyImageIntent(
  messages: { role: string; content: string }[]
): Promise<boolean> {
  const recent = messages
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  try {
    const r = await chat({
      model: "haiku",
      maxTokens: 4,
      temperature: 0,
      system: `Decide if the USER's latest message is a request to generate, create, or regenerate a visual IMAGE / picture / poster / graphic / ad creative right now.
This INCLUDES follow-ups that refer back to a previous image, like "make another one", "create a better version", "a different one", "regenerate it", "make it more professional".
This does NOT include requests for captions, hooks, scripts, text, ideas, or strategy.
Reply with exactly one word: IMAGE or TEXT.`,
      messages: [{ role: "user", content: recent }],
    });
    return /image/i.test(r.text);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    // Burst rate limit (separate from the MVP daily cap)
    const rl = limits.chat(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many messages — slow down a bit.", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { mode, messages } = parsed.data;
    let { chatId } = parsed.data;

    // Jailbreak inspection on the latest user message
    const latest = [...messages].reverse().find((m) => m.role === "user");
    if (latest) {
      const check = inspect(latest.content);
      if (check.isAttempt) {
        await logSecurityEvent(user.id, latest.content, check.reason ?? "unknown");
        return NextResponse.json({
          reply: JAILBREAK_REPLY,
          fallback: false,
          blocked: true,
          chatId: chatId ?? null,
        });
      }
      latest.content = check.sanitized || latest.content;
    }

    const sql = getDb();

    // Ensure a chat row exists
    if (!chatId) {
      const firstUserMsg =
        messages.find((m) => m.role === "user")?.content ?? "New chat";
      const created = await sql`
        INSERT INTO chats (user_id, title, mode)
        VALUES (${user.id}, ${makeTitle(firstUserMsg)}, ${mode})
        RETURNING id
      `;
      chatId = created[0].id as string;
    } else {
      const owner = await sql`
        SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${user.id} LIMIT 1
      `;
      if (owner.length === 0) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
    }

    // Persist the user message
    if (latest) {
      await sql`
        INSERT INTO chat_messages (chat_id, role, content)
        VALUES (${chatId}, 'user', ${latest.content})
      `;
    }

    const brandRows = await sql`
      SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    const brand = brandRows[0] ?? {};

    // Obvious keyword match first (fast); otherwise classify with Haiku so
    // follow-ups like "make another one" / "a better version" are caught.
    let wantsImage = latest ? isImageRequest(latest.content) : false;
    if (!wantsImage && latest) {
      wantsImage = await classifyImageIntent(messages);
    }

    // ───── IMAGE PATH (counts toward the daily image limit) ─────
    if (wantsImage) {
      const allowed = await canGenerateImage(user.id);
      if (!allowed) {
        await logEvent(user.id, "limit_hit", { limitType: "images" });
        const usage = await getUsage(user.id);
        await sql`
          INSERT INTO chat_messages (chat_id, role, content)
          VALUES (${chatId}, 'assistant', ${MVP_LIMIT_MESSAGE})
        `;
        await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
        return NextResponse.json({
          reply: MVP_LIMIT_MESSAGE,
          mvpLimit: true,
          limitType: "images",
          usage,
          chatId,
        });
      }

      // Two-stage pipeline: text-free Ideogram image + Sharp/SVG text overlay
      // → perfect spelling, every time. If the user specified an exact hook /
      // headline / CTA, it is used VERBATIM (the AI never rewrites it).
      const forced = extractForcedText(latest!.content);
      const result = await generateMarketingImage(
        brand,
        latest!.content,
        forced
      );
      await consumeImage(user.id);
      await logEvent(user.id, "image_generated", { fallback: result.fallback });

      const reply = result.fallback
        ? "Here's an image — placeholder visuals (add IDEOGRAM_API_KEY for real creatives), but the text is real and editable below."
        : "Here's your image. The text is rendered cleanly — tap \"Edit text\" to change the headline or CTA instantly.";

      const imageMeta = {
        baseUrl: result.baseUrl,
        headline: result.headline,
        cta: result.cta,
      };

      const inserted = await sql`
        INSERT INTO chat_messages (chat_id, role, content, image_url, image_meta)
        VALUES (${chatId}, 'assistant', ${reply}, ${result.url}, ${JSON.stringify(
          imageMeta
        )}::jsonb)
        RETURNING id
      `;
      await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;

      const usage = await getUsage(user.id);
      return NextResponse.json({
        reply,
        imageUrl: result.url,
        imageMeta: { ...imageMeta, messageId: inserted[0].id },
        fallback: result.fallback,
        usage,
        chatId,
      });
    }

    // ───── TEXT PATH (counts toward 10/day messages) ─────
    const allowedMsg = await canGeneratePost(user.id);
    if (!allowedMsg) {
      await logEvent(user.id, "limit_hit", { limitType: "messages" });
      const usage = await getUsage(user.id);
      await sql`
        INSERT INTO chat_messages (chat_id, role, content)
        VALUES (${chatId}, 'assistant', ${MVP_LIMIT_MESSAGE})
      `;
      await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
      return NextResponse.json({
        reply: MVP_LIMIT_MESSAGE,
        mvpLimit: true,
        limitType: "messages",
        usage,
        chatId,
      });
    }

    const system = buildSystemPrompt(brand, mode as Mode);

    let reply: string;
    let modelUsed: string;
    let fallback = false;
    try {
      const r = await chat({ system, messages, model: "haiku" });
      reply = r.text;
      modelUsed = r.model;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const isCreditOrAuth = /402|401|credits|not set|api[_ ]key/i.test(msg);
      if (isCreditOrAuth) {
        reply = FALLBACK_REPLY;
        modelUsed = "fallback";
        fallback = true;
      } else {
        throw e;
      }
    }

    await sql`
      INSERT INTO chat_messages (chat_id, role, content)
      VALUES (${chatId}, 'assistant', ${reply})
    `;
    await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;

    await consumePost(user.id);
    await logEvent(user.id, "post_generated", { kind: "chat", fallback });

    const usage = await getUsage(user.id);
    return NextResponse.json({
      reply,
      model: modelUsed,
      fallback,
      usage,
      chatId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
