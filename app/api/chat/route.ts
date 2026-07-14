import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { buildSystemPrompt, type Mode } from "@/lib/prompts";
import { brainContext } from "@/lib/brain";
import { chat } from "@/lib/claude";
import { generateCaption } from "@/lib/image-brief";
import {
  isAdBrief,
  isAdMode,
  isColorCombo,
  nextAdQuestion,
  AD_MODE_LABELS,
  AD_MODE_IDS,
  COLOR_COMBO_LABELS,
  COLOR_COMBO_IDS,
  type AdBrief,
  type AdField,
} from "@/lib/ad-brief";
import {
  generateAd,
  editAd,
  rerenderOverBackground,
  regenerateFromState,
  type AdImageMeta,
  type AdRenderState,
} from "@/lib/ad-imagegen";
import { interpretEdit, type EditableAd } from "@/lib/brief-interpreter";
import { isArchetype } from "@/lib/resolved-brief";
import { describeProduct, writeAdCopy, editAdCopy } from "@/lib/ad-copy";
import { loadImageBuffer, isAllowedImageUrl } from "@/lib/storage";
import { inspect, limits, logSecurityEvent } from "@/lib/security";
import {
  consumePostIfAllowed,
  refundPost,
  canGenerateImage,
  consumeImage,
  getUsage,
  MVP_LIMIT_MESSAGE,
} from "@/lib/usage";
import { logEvent } from "@/lib/events";
import { errorJson } from "@/lib/http";

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
      field: z.enum(["mode", "color"]),
      value: z.string().min(1).max(400),
    })
    .nullable()
    .optional(),
  photoUrl: z.string().max(2000).optional(),
});

interface AdActions {
  field: AdField;
  intro: string;
  options: { label: string; value: string }[];
}

function buildAdActions(field: AdField): AdActions {
  if (field === "mode") {
    return {
      field,
      intro:
        "Nice photo! How should I use it — keep your exact product, or create a stylized version?",
      options: AD_MODE_IDS.map((m) => ({ label: AD_MODE_LABELS[m], value: m })),
    };
  }
  return {
    field,
    intro: "Which color style should the ad use?",
    options: COLOR_COMBO_IDS.map((c) => ({
      label: COLOR_COMBO_LABELS[c],
      value: c,
    })),
  };
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
  /\b(image|images|picture|pic|pics|visual|visuals|poster|creative|creatives|graphic|banner|photo|thumbnail|artwork|mockup|ad|ads|advert|advertisement)\b/i;
const IMG_VERB =
  /\b(make|create|generate|design|need|want|give|build|draw|show|produce)\b/i;
function isImageRequest(text: string): boolean {
  return IMG_NOUN.test(text) && IMG_VERB.test(text);
}

// Edit of the most-recent ad ("change the headline to…", "make it say 40% off",
// "move the logo top left", "use the big headline style", "make it premium").
const EDIT_RX =
  /\b(change|replace|rename|call it|instead|edit|update|shorter|longer|bigger|smaller|headline|sub-?head|subtitle|caption|cta|button|say|wording|reword|logo|move|mood|premium|minimal|energetic|warm|bold|style|layout|archetype|font)\b/i;
function isEditInstruction(text: string): boolean {
  return EDIT_RX.test(text) && !isImageRequest(text);
}

// "yes" to a proposed (cost-incurring) background edit.
const AFFIRM_RX = /^\s*(yes|yep|yeah|yup|ya|ok|okay|sure|do it|go|go ahead|apply|confirm|please do|sounds good|👍|✅)\b/i;
function isAffirmation(text: string): boolean {
  return AFFIRM_RX.test(text.trim());
}

// Extract the editable spec from a stored render state (Part C).
function stateToEditable(s: AdRenderState): EditableAd {
  return {
    headline: s.copy.headline,
    subhead: s.copy.subhead,
    cta: s.copy.cta,
    benefits: s.copy.bullets,
    price: s.price,
    discount: s.discount,
    mood: s.mood,
    archetype: s.archetype,
    logoCorner: s.logoCorner,
  };
}

// Apply an interpreted edit back onto the render state.
function applyEditable(s: AdRenderState, n: EditableAd): AdRenderState {
  return {
    ...s,
    copy: { ...s.copy, headline: n.headline, subhead: n.subhead ?? s.copy.subhead, cta: n.cta, bullets: n.benefits },
    price: n.price,
    discount: n.discount,
    mood: n.mood,
    archetype: isArchetype(n.archetype) ? n.archetype : s.archetype,
    logoCorner: (n.logoCorner as AdRenderState["logoCorner"]) ?? undefined,
  };
}

// Pull a likely product name out of the request ("create an ad for a perfume
// bottle" → "a perfume bottle").
function deriveProductName(text?: string): string | undefined {
  if (!text) return undefined;
  let t = text.trim();
  t = t.replace(
    /^(please\s+)?(create|make|generate|design|give me|build|need|want|show me|draw|produce)\s+(me\s+)?(an?|some|the)?\s*/i,
    ""
  );
  t = t.replace(
    /\b(ad|ads|advert|advertisement|image|poster|creative|graphic|banner|visual|promo)\b/gi,
    " "
  );
  t = t.replace(/^(for|of|about)\s+/i, "");
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 120) || undefined;
}

async function toDataUri(photoUrl: string): Promise<string> {
  const buf = await loadImageBuffer(photoUrl);
  const small = await sharp(buf)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${small.toString("base64")}`;
}

// For everything else (e.g. follow-ups like "make another one") a tiny Haiku
// call classifies intent using the conversation.
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

    // Validate the uploaded photo URL (SSRF guard) — only our own storage.
    const photoUrl =
      parsed.data.photoUrl && isAllowedImageUrl(parsed.data.photoUrl)
        ? parsed.data.photoUrl
        : undefined;

    // Jailbreak inspection on the latest user message.
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

    // Ensure a chat row exists.
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

    // Persist the user message.
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

    // Load any pending ad brief from the chat row.
    const chatRow = await sql`
      SELECT pending_brief FROM chats WHERE id = ${chatId} LIMIT 1
    `;
    const rawPending = chatRow[0]?.pending_brief ?? null;
    const pendingBrief: AdBrief | null = isAdBrief(rawPending) ? rawPending : null;

    // Shared "out of image credits" response.
    const imageLimit = async () => {
      await logEvent(user.id, "limit_hit", { limitType: "images" });
      const usage = await getUsage(user.id);
      await sql`INSERT INTO chat_messages (chat_id, role, content) VALUES (${chatId}, 'assistant', ${MVP_LIMIT_MESSAGE})`;
      await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
      return NextResponse.json({ reply: MVP_LIMIT_MESSAGE, mvpLimit: true, limitType: "images", usage, chatId });
    };

    // ───── NATURAL-LANGUAGE EDIT of the most recent ad ─────
    if (!briefAnswer && !pendingBrief && !photoUrl && latest) {
      const editIntent = isEditInstruction(latest.content);
      const affirm = isAffirmation(latest.content);
      if (editIntent || affirm) {
        const lastImg = await sql`
          SELECT id, image_meta FROM chat_messages
          WHERE chat_id = ${chatId} AND image_url IS NOT NULL
          ORDER BY created_at DESC LIMIT 1
        `;
        const rawMeta = (lastImg[0]?.image_meta ?? null) as
          | (Record<string, unknown> & { v?: number; copy?: AdImageMeta["copy"]; renderState?: AdRenderState })
          | null;
        const state =
          rawMeta?.renderState && rawMeta.renderState.v === 3 ? rawMeta.renderState : null;

        // ── Phase 2 smart edit (render state present) ──
        if (state) {
          // Persist an edited ad as a fresh assistant message (keeps the v2 meta
          // shape for the manual Edit panel + the v3 renderState for future edits).
          const emit = async (url: string, nextState: AdRenderState, reply: string) => {
            const storedMeta = {
              ...(rawMeta ?? {}),
              v: 2,
              copy: {
                headline: nextState.copy.headline,
                subhead: nextState.copy.subhead ?? "",
                cta: nextState.copy.cta,
              },
              renderState: { ...nextState, pendingEdit: null },
            };
            // Clear any pending edit on the prior ad message.
            await sql`UPDATE chat_messages SET image_meta = ${JSON.stringify({ ...(rawMeta ?? {}), renderState: { ...state, pendingEdit: null } })}::jsonb WHERE id = ${lastImg[0].id}`;
            const inserted = await sql`
              INSERT INTO chat_messages (chat_id, role, content, image_url, image_meta)
              VALUES (${chatId}, 'assistant', ${reply}, ${url}, ${JSON.stringify(storedMeta)}::jsonb)
              RETURNING id`;
            await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
            const usage = await getUsage(user.id);
            return NextResponse.json({
              reply,
              imageUrl: url,
              imageMeta: { v: 2, copy: storedMeta.copy, messageId: inserted[0].id },
              usage,
              chatId,
            });
          };

          // (a) Confirm a previously-proposed (cost-incurring) background edit.
          if (state.pendingEdit && affirm) {
            if (!(await canGenerateImage(user.id))) return imageLimit();
            const changes = state.pendingEdit.changes;
            const applied: AdRenderState = { ...state, ...state.pendingEdit.next, pendingEdit: null };
            const result = await regenerateFromState(applied);
            await consumeImage(user.id);
            await logEvent(user.id, "image_generated", { kind: "nl_edit_bg", fallback: result.fallback });
            return emit(result.url, result.state!, `✅ New background applied — used 1 generation.\n• ${changes.join("\n• ")}`);
          }

          // (b) A fresh edit instruction.
          if (editIntent) {
            const outcome = await interpretEdit(stateToEditable(state), latest.content);
            if (!outcome.changes.length) {
              const reply =
                'I couldn\'t tell what to change — try e.g. "change the headline to SHIP FASTER", "use the big headline style", or "make it premium".';
              await sql`INSERT INTO chat_messages (chat_id, role, content) VALUES (${chatId}, 'assistant', ${reply})`;
              await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
              const usage = await getUsage(user.id);
              return NextResponse.json({ reply, usage, chatId });
            }
            const nextState = applyEditable(state, outcome.next);

            if (outcome.kind === "text") {
              // Free: re-render text/logo over the SAME background — no credit.
              const { url } = await rerenderOverBackground(nextState);
              await logEvent(user.id, "image_generated", { kind: "nl_edit_text", fallback: false });
              return emit(
                url,
                nextState,
                `✏️ Done — text-only change, instant and free (no generation used):\n• ${outcome.changes.join("\n• ")}`
              );
            }

            // Background edit → confirm before spending a generation.
            if (!(await canGenerateImage(user.id))) return imageLimit();
            const pending: AdRenderState = {
              ...state,
              pendingEdit: {
                changes: outcome.changes,
                next: {
                  mood: nextState.mood,
                  copy: nextState.copy,
                  price: nextState.price,
                  discount: nextState.discount,
                  archetype: nextState.archetype,
                  logoCorner: nextState.logoCorner,
                },
              },
            };
            await sql`UPDATE chat_messages SET image_meta = ${JSON.stringify({ ...(rawMeta ?? {}), renderState: pending })}::jsonb WHERE id = ${lastImg[0].id}`;
            const reply = `This one needs a new background, so it'll use 1 generation:\n• ${outcome.changes.join("\n• ")}\n\nReply "yes" to apply, or tell me a different change.`;
            await sql`INSERT INTO chat_messages (chat_id, role, content) VALUES (${chatId}, 'assistant', ${reply})`;
            await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
            const usage = await getUsage(user.id);
            return NextResponse.json({ reply, editConfirm: true, changes: outcome.changes, usage, chatId });
          }
        }

        // ── Legacy v2 edit (older ads without a render state) ──
        const meta = rawMeta && rawMeta.v === 2 && rawMeta.copy ? (rawMeta as unknown as AdImageMeta) : null;
        if (meta && editIntent) {
          if (!(await canGenerateImage(user.id))) return imageLimit();
          const newCopy = await editAdCopy(meta.copy, latest.content);
          const result = await editAd(brand, meta, newCopy);
          await consumeImage(user.id);
          await logEvent(user.id, "image_generated", { kind: "nl_edit", fallback: result.fallback });
          const newMeta: AdImageMeta = { ...meta, color: result.color, copy: result.copy, lever: result.lever };
          await sql`UPDATE chat_messages SET image_url = ${result.url}, image_meta = ${JSON.stringify(newMeta)}::jsonb WHERE id = ${lastImg[0].id}`;
          const reply = "Updated the ad with your change.";
          const inserted = await sql`
            INSERT INTO chat_messages (chat_id, role, content, image_url, image_meta)
            VALUES (${chatId}, 'assistant', ${reply}, ${result.url}, ${JSON.stringify(newMeta)}::jsonb)
            RETURNING id`;
          await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;
          const usage = await getUsage(user.id);
          return NextResponse.json({
            reply,
            imageUrl: result.url,
            imageMeta: { ...newMeta, messageId: inserted[0].id },
            fallback: result.fallback,
            usage,
            chatId,
            debug: result.debug,
          });
        }
      }
    }

    // Decide whether this turn is an image/ad request.
    let wantsImage = !!photoUrl || (latest ? isImageRequest(latest.content) : false);
    if (!wantsImage && latest && !pendingBrief) {
      wantsImage = await classifyImageIntent(messages);
    }

    const inBriefFlow = !!briefAnswer || !!pendingBrief || wantsImage;

    // ───── AD STUDIO PATH ─────
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

      // 1) Seed or resume the ad brief.
      let brief: AdBrief =
        pendingBrief ?? {
          v: 2,
          request: latest?.content ?? "",
          productSource: photoUrl ? "upload" : "text",
          photoUrl,
          productName: deriveProductName(latest?.content),
        };

      // 2) Apply the chip answer.
      if (briefAnswer) {
        if (briefAnswer.field === "mode" && isAdMode(briefAnswer.value)) {
          brief = { ...brief, mode: briefAnswer.value };
        } else if (briefAnswer.field === "color" && isColorCombo(briefAnswer.value)) {
          brief = { ...brief, color: briefAnswer.value };
        }
      } else if (pendingBrief && latest && !brief.productName) {
        // User typed a product name while we were waiting.
        brief = { ...brief, productName: deriveProductName(latest.content) };
      }

      // 3) What's still missing?
      const need = nextAdQuestion(brief);
      if (need !== null) {
        const actions = buildAdActions(need);
        const reply = actions.intro;
        await sql`
          UPDATE chats
          SET pending_brief = ${JSON.stringify(brief)}::jsonb, updated_at = now()
          WHERE id = ${chatId}
        `;
        const inserted = await sql`
          INSERT INTO chat_messages (chat_id, role, content, actions)
          VALUES (${chatId}, 'assistant', ${reply}, ${JSON.stringify(actions)}::jsonb)
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

      // 4) Complete — generate the ad.
      if (!allowed) {
        await logEvent(user.id, "limit_hit", { limitType: "images" });
        const usage = await getUsage(user.id);
        await sql`UPDATE chats SET pending_brief = NULL WHERE id = ${chatId}`;
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

      // Vision: describe the uploaded product (cache it on the brief).
      if (brief.productSource === "upload" && brief.photoUrl && !brief.productDescription) {
        try {
          brief.productDescription = await describeProduct(await toDataUri(brief.photoUrl));
        } catch {
          brief.productDescription = "";
        }
      }

      const productName =
        brief.productName || brief.productDescription || "the product";

      // Auto-write the on-image copy.
      if (!brief.copy) {
        const copy = await writeAdCopy({
          product: productName,
          description: brief.productDescription,
          brand,
        });
        brief.copy = { headline: copy.headline, subhead: copy.subhead, cta: copy.cta };
      }

      const result = await generateAd(brand, brief, `${chatId}:${Date.now()}`);
      await consumeImage(user.id);
      await logEvent(user.id, "image_generated", {
        mode: result.mode,
        fallback: result.fallback,
      });

      const caption = await generateCaption(brief.request, brand, {
        request: brief.request,
        hook: brief.copy.headline,
      });

      const baseReply = result.fallback
        ? "Here's your ad — placeholder visuals (add IDEOGRAM_API_KEY for real creatives). The headline/CTA are baked in by Ideogram."
        : "Here's your ad — ready to post. Want changes? Just tell me (e.g. \"change the headline to …\") or use Edit below.";
      const reply = caption
        ? `${baseReply}\n\nRecommended caption — copy this into your post:\n\n${caption}`
        : baseReply;

      const meta: AdImageMeta = {
        v: 2,
        productName: brief.productName,
        productDescription: brief.productDescription,
        photoUrl: brief.photoUrl,
        mode: result.mode,
        color: result.color,
        copy: result.copy,
        lever: result.lever,
      };
      // Persist the Phase 2 render state alongside the v2 meta so conversational
      // edits can re-render over the same background (Part C).
      const storedMeta = { ...meta, renderState: result.state };

      const inserted = await sql`
        INSERT INTO chat_messages (chat_id, role, content, image_url, image_meta)
        VALUES (${chatId}, 'assistant', ${reply}, ${result.url}, ${JSON.stringify(storedMeta)}::jsonb)
        RETURNING id
      `;
      await sql`
        UPDATE chats SET pending_brief = NULL, updated_at = now() WHERE id = ${chatId}
      `;

      const usage = await getUsage(user.id);
      return NextResponse.json({
        reply,
        imageUrl: result.url,
        imageMeta: { ...meta, messageId: inserted[0].id },
        fallback: result.fallback,
        usage,
        chatId,
        debug: result.debug,
      });
    }

    // ───── TEXT PATH (counts toward 10/day messages) ─────
    // Atomically reserve the slot up front (enforces the cap in one write).
    const reserved = await consumePostIfAllowed(user.id);
    if (!reserved.ok) {
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

    const system = buildSystemPrompt(brand, mode as Mode) + brainContext();

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
        // Real failure — give back the reserved slot before bubbling up.
        await refundPost(user.id);
        throw e;
      }
    }

    await sql`
      INSERT INTO chat_messages (chat_id, role, content)
      VALUES (${chatId}, 'assistant', ${reply})
    `;
    await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;

    // Slot already reserved atomically above.
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
    return errorJson(e);
  }
}
