import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { chat } from "@/lib/claude";
import { buildShipPrompt, ThreeAngles } from "@/lib/prompts-v2";
import { inspect, limits, logSecurityEvent } from "@/lib/security";
import {
  consumePostIfAllowed,
  refundPost,
  getUsage,
  MVP_LIMIT_MESSAGE,
} from "@/lib/usage";
import { logEvent } from "@/lib/events";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  input: z.string().min(3).max(4000),
  // When set, regenerate ONLY that angle. Otherwise generate all 3.
  only: z.enum(["bts", "lesson", "outcome"]).optional(),
  // Updating an existing post (e.g. regenerate one angle).
  postId: z.string().uuid().optional(),
});

const AngleSchema = z.object({
  hook: z.string(),
  body: z.string(),
  why: z.string(),
});
const FullSchema = z.object({
  bts: AngleSchema,
  lesson: AngleSchema,
  outcome: AngleSchema,
});

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return candidate.trim();
  return candidate.slice(start, end + 1).trim();
}

function demoAngles(input: string): ThreeAngles {
  const snippet = input.length > 80 ? input.slice(0, 77) + "…" : input;
  return {
    bts: {
      hook: "spent 4 hours on this today.",
      body: `${snippet}\n\nthe annoying part: getting the edge cases right. the satisfying part: watching it finally do the thing.`,
      why: "Process posts build trust because they show real work, not polished claims.",
    },
    lesson: {
      hook: "small realisation:",
      body: `${snippet}\n\nthe thing nobody tells you — shipping isn't the hard part. deciding what's worth shipping is.`,
      why: "Lesson angle reframes work into a generalizable insight others can use.",
    },
    outcome: {
      hook: "ok this is live.",
      body: `${snippet}\n\nif you've been waiting on this, go try it. feedback welcome.`,
      why: "Outcome posts drive action — clear status + clear ask.",
    },
  };
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Generation limit reached.", retryAfterMs: rl.retryAfterMs },
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
    const { input, only, postId } = parsed.data;

    // MVP daily limit — only full generations count (regenerate is free).
    const isFullGeneration = !only;

    // Jailbreak inspect (before reserving a slot, so a blocked attempt is free).
    const check = inspect(input);
    if (check.isAttempt) {
      await logSecurityEvent(user.id, input, check.reason ?? "unknown");
      return NextResponse.json(
        { error: "I can only help you turn your work into posts." },
        { status: 400 }
      );
    }
    const safeInput = check.sanitized || input;

    // Atomically reserve one generation, enforcing the cap in a single write so
    // concurrent requests can't both slip past a separate check (TOCTOU).
    if (isFullGeneration) {
      const reserved = await consumePostIfAllowed(user.id);
      if (!reserved.ok) {
        const usage = await getUsage(user.id);
        await logEvent(user.id, "limit_hit", { limitType: "posts" });
        return NextResponse.json(
          {
            error: MVP_LIMIT_MESSAGE,
            mvpLimit: true,
            limitType: "posts",
            usage,
          },
          { status: 429 }
        );
      }
    }

    // Fetch voice profile (or use empty defaults so the flow works pre-onboarding)
    const sql = getDb();
    const voiceRows = await sql`
      SELECT * FROM voice_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    const voice = voiceRows[0] ?? {};
    const system = buildShipPrompt(voice);

    const userTurn = only
      ? `What I shipped:\n${safeInput}\n\nRegenerate ONLY the "${only}" angle. Return the same JSON shape with all three keys but only change "${only}" — keep the others as empty strings.`
      : `What I shipped:\n${safeInput}\n\nReturn the JSON with all three angles.`;

    let angles: ThreeAngles;
    let modelUsed = "fallback";
    let fallback = false;

    try {
      const r = await chat({
        system,
        messages: [{ role: "user", content: userTurn }],
        model: "haiku", // MVP: Haiku for all text generation
        temperature: 0.9,
        maxTokens: 1400,
      });
      modelUsed = r.model;
      const obj = JSON.parse(extractJson(r.text));
      angles = FullSchema.parse(obj);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown";
      const isCreditOrAuth = /402|401|credits|not set|api[_ ]key/i.test(msg);
      if (isCreditOrAuth) {
        angles = demoAngles(safeInput);
        fallback = true;
      } else {
        // Generation failed for real — give back the reserved slot.
        if (isFullGeneration) await refundPost(user.id);
        return NextResponse.json(
          { error: "Generation failed. Please try again." },
          { status: 502 }
        );
      }
    }

    // Persist or update post
    let saved;
    if (postId) {
      // Update the requested angle on the existing post.
      if (only === "bts") {
        await sql`UPDATE posts SET angle_bts = ${angles.bts as unknown as string} WHERE id = ${postId} AND user_id = ${user.id}`;
      } else if (only === "lesson") {
        await sql`UPDATE posts SET angle_lesson = ${angles.lesson as unknown as string} WHERE id = ${postId} AND user_id = ${user.id}`;
      } else if (only === "outcome") {
        await sql`UPDATE posts SET angle_outcome = ${angles.outcome as unknown as string} WHERE id = ${postId} AND user_id = ${user.id}`;
      } else {
        await sql`
          UPDATE posts
          SET angle_bts = ${angles.bts as unknown as string},
              angle_lesson = ${angles.lesson as unknown as string},
              angle_outcome = ${angles.outcome as unknown as string}
          WHERE id = ${postId} AND user_id = ${user.id}
        `;
      }
      const rows = await sql`SELECT * FROM posts WHERE id = ${postId} AND user_id = ${user.id} LIMIT 1`;
      saved = rows[0];
    } else {
      const inserted = await sql`
        INSERT INTO posts (user_id, input, angle_bts, angle_lesson, angle_outcome)
        VALUES (
          ${user.id},
          ${safeInput},
          ${angles.bts as unknown as string},
          ${angles.lesson as unknown as string},
          ${angles.outcome as unknown as string}
        )
        RETURNING *
      `;
      saved = inserted[0];
    }

    // Slot was already reserved atomically above (full gen only).
    if (isFullGeneration) {
      await logEvent(user.id, "post_generated", {
        postId: saved?.id,
        inputLength: safeInput.length,
        fallback,
      });
    } else {
      await logEvent(user.id, "angle_regenerated", {
        postId: saved?.id,
        angle: only,
      });
    }
    const usage = await getUsage(user.id);

    return NextResponse.json({
      post: saved,
      angles,
      model: modelUsed,
      fallback,
      usage,
    });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
