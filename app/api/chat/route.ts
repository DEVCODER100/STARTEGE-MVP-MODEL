import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { buildSystemPrompt, type Mode } from "@/lib/prompts";
import { chat } from "@/lib/claude";
import {
  generateMarketingImage,
  generateMarketingImageFromBrief,
} from "@/lib/imagegen";
import { extractForcedText } from "@/lib/imageplan";
import {
  inferBrief,
  nextQuestion,
  generateHooks,
  TEMPLATE_LABELS,
  COLOR_LABELS,
  type ImageBrief,
  type BriefField,
  type BriefActions,
  type Template,
  type ColorMode,
} from "@/lib/image-brief";
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
  briefAnswer: z
    .object({
      field: z.enum(["template", "hook", "color"]),
      value: z.string().min(1).max(400),
    })
    .nullable()
    .optional(),
});

const TEMPLATE_IDS: Template[] = [
  "product_launch",
  "feature_update",
  "founder_story",
  "educational",
  "testimonial",
  "problem_solution",
  "announcement",
  "milestone",
];
const COLOR_IDS: ColorMode[] = ["brand", "brand_plus_accent", "custom"];

function isTemplate(v: string): v is Template {
  return (TEMPLATE_IDS as string[]).includes(v);
}
function isColorMode(v: string): v is ColorMode {
  return (COLOR_IDS as string[]).includes(v);
}

function buildActionsFor(
  field: BriefField,
  brief: ImageBrief
): BriefActions {
  if (field === "template") {
    return {
      field,
      intro: "What type of image do you want to create?",
      options: TEMPLATE_IDS.map((t) => ({
        label: TEMPLATE_LABELS[t],
        value: t,
      })),
    };
  }
  if (field === "hook") {
    const hooks = brief.hookOptions ?? [];
    return {
      field,
      intro:
        "Pick a hook for your headline — or just type your own as your next message.",
      options: hooks.map((h) => ({ label: h, value: h, isHookText: true })),
    };
  }
  return {
    field,
    intro: "Which color style should we use?",
    options: COLOR_IDS.map((c) => ({ label: COLOR_LABELS[c], value: c })),
  };
}

function applyBriefAnswer(
  brief: ImageBrief,
  answer: { field: BriefField; value: string }
): ImageBrief {
  const next = { ...brief };
  if (answer.field === "template" && isTemplate(answer.value)) {
    next.template = answer.value;
  } else if (answer.field === "color" && isColorMode(answer.value)) {
    next.color = answer.value;
  } else if (answer.field === "hook") {
    next.hook = answer.value.trim().replace(/^["']|["']$/g, "");
  }
  return next;
}

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
    const { mode, messages, briefAnswer } = parsed.data;
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

    // Load any pending brief from the chat row.
    const chatRow = await sql`
      SELECT pending_brief FROM chats WHERE id = ${chatId} LIMIT 1
    `;
    const pendingBrief: ImageBrief | null =
      (chatRow[0]?.pending_brief as ImageBrief | null) ?? null;

    // Obvious keyword match first (fast); otherwise classify with Haiku so
    // follow-ups like "make another one" / "a better version" are caught.
    let wantsImage = latest ? isImageRequest(latest.content) : false;
    if (!wantsImage && latest) {
      wantsImage = await classifyImageIntent(messages);
    }

    // We're in the brief flow if any of these are true.
    const inBriefFlow =
      !!briefAnswer || !!pendingBrief || wantsImage;

    // ───── IMAGE / BRIEF PATH ─────
    if (inBriefFlow) {
      const allowed = await canGenerateImage(user.id);
      if (!allowed && !pendingBrief) {
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

      // 1) Seed or resume the brief.
      let brief: ImageBrief =
        pendingBrief ?? (await inferBrief(latest?.content ?? ""));

      // 2) Apply the user's answer (chip tap or free-text hook).
      if (briefAnswer) {
        brief = applyBriefAnswer(brief, briefAnswer);
      } else if (
        pendingBrief &&
        nextQuestion(pendingBrief) === "hook" &&
        latest
      ) {
        // User typed a free-text hook instead of tapping a chip.
        brief = applyBriefAnswer(brief, {
          field: "hook",
          value: latest.content,
        });
      } else if (pendingBrief && latest) {
        // User typed something else while we were waiting on a chip.
        // Try to interpret it: re-infer to see if they filled the answer in
        // prose ("let's go with founder story", "use brand colors").
        const reinfer = await inferBrief(latest.content);
        brief = {
          ...brief,
          template: brief.template ?? reinfer.template,
          color: brief.color ?? reinfer.color,
          hook: brief.hook ?? reinfer.hook,
        };
      }

      // 3) What's still missing?
      const need = nextQuestion(brief);

      if (need !== null) {
        // Pre-generate hook options on the way to the hook question.
        if (need === "hook" && !brief.hookOptions) {
          brief.hookOptions = await generateHooks(
            brief.request,
            brand,
            brief.template!
          );
        }

        const actions = buildActionsFor(need, brief);
        const reply = actions.intro;

        // Persist the brief and the assistant message with the chips.
        await sql`
          UPDATE chats
          SET pending_brief = ${JSON.stringify(brief)}::jsonb,
              updated_at = now()
          WHERE id = ${chatId}
        `;
        const inserted = await sql`
          INSERT INTO chat_messages (chat_id, role, content, actions)
          VALUES (${chatId}, 'assistant', ${reply}, ${JSON.stringify(
            actions
          )}::jsonb)
          RETURNING id
        `;

        const usage = await getUsage(user.id);
        return NextResponse.json({
          reply,
          actions: { ...actions, messageId: inserted[0].id },
          usage,
          chatId,
          briefPending: true,
        });
      }

      // 4) Brief is complete — generate the image.
      if (!allowed) {
        // Edge case: brief completed but daily limit just hit.
        await logEvent(user.id, "limit_hit", { limitType: "images" });
        const usage = await getUsage(user.id);
        await sql`
          UPDATE chats SET pending_brief = NULL WHERE id = ${chatId}
        `;
        await sql`
          INSERT INTO chat_messages (chat_id, role, content)
          VALUES (${chatId}, 'assistant', ${MVP_LIMIT_MESSAGE})
        `;
        return NextResponse.json({
          reply: MVP_LIMIT_MESSAGE,
          mvpLimit: true,
          limitType: "images",
          usage,
          chatId,
        });
      }

      // Honor any explicit headline/CTA the user gave in the very first
      // message (e.g. headline: "..."), but only if they didn't pick a hook.
      const forced = extractForcedText(brief.request);
      const briefForGen: ImageBrief = {
        ...brief,
        hook: brief.hook || forced.headline || brief.hook,
      };

      let result;
      try {
        result = await generateMarketingImageFromBrief(brand, briefForGen);
      } catch {
        // Last-resort fallback to the legacy planner.
        result = await generateMarketingImage(brand, brief.request, forced);
      }
      await consumeImage(user.id);
      await logEvent(user.id, "image_generated", {
        fallback: result.fallback,
        template: briefForGen.template,
      });

      const reply = result.fallback
        ? "Here's an image — placeholder visuals (add IDEOGRAM_API_KEY for real creatives), but the text is real and editable below."
        : "Here's your image. The text is rendered cleanly — tap \"Edit text\" to change the headline or CTA instantly.";

      const imageMeta = {
        baseUrl: result.baseUrl,
        headline: result.headline,
        cta: result.cta,
        direction: result.direction,
      };

      const inserted = await sql`
        INSERT INTO chat_messages (chat_id, role, content, image_url, image_meta)
        VALUES (${chatId}, 'assistant', ${reply}, ${result.url}, ${JSON.stringify(
          imageMeta
        )}::jsonb)
        RETURNING id
      `;
      await sql`
        UPDATE chats
        SET pending_brief = NULL, updated_at = now()
        WHERE id = ${chatId}
      `;

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
