import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { generateImages } from "@/lib/ideogram";
import { inspect, logSecurityEvent } from "@/lib/security";
import {
  canGenerateImage,
  consumeImage,
  getUsage,
  MVP_LIMIT_MESSAGE,
} from "@/lib/usage";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  postId: z.string().uuid().optional(),
  // The post text (or "what I shipped" input) the image should illustrate.
  context: z.string().min(3).max(2000),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    // MVP daily image limit
    const allowed = await canGenerateImage(user.id);
    if (!allowed) {
      const usage = await getUsage(user.id);
      await logEvent(user.id, "limit_hit", { limitType: "images" });
      return NextResponse.json(
        {
          error: MVP_LIMIT_MESSAGE,
          mvpLimit: true,
          limitType: "images",
          usage,
        },
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
    const { postId, context } = parsed.data;

    const check = inspect(context);
    if (check.isAttempt) {
      await logSecurityEvent(user.id, context, check.reason ?? "unknown");
      return NextResponse.json(
        { error: "I can only help you turn your work into posts." },
        { status: 400 }
      );
    }

    // Build a clean visual prompt for a build-in-public post image.
    const prompt = `A clean, modern social media graphic about: ${check.sanitized}.
SCENE: minimal, developer-aesthetic, soft background.
STYLE: flat, professional, calm. No clutter.
COLORS: off-white background, deep teal accent.
FORMAT: Square 1080x1080.
QUALITY: ultra high quality, crisp.

TEXT RULES — CRITICAL (image models garble long text):
- AT MOST one short headline: 3 to 5 words maximum.
- NO sentences, NO paragraphs, NO body text, NO small print.
- If unsure, use fewer words or none — a clean visual beats garbled text.
MOOD: focused, credible, indie-hacker.`;

    const result = await generateImages({
      prompt,
      count: 1,
      aspectRatio: "ASPECT_1_1",
    });
    const url = result.urls[0];

    // Count it (1 image = 1 unit).
    await consumeImage(user.id);
    await logEvent(user.id, "image_generated", {
      postId: postId ?? null,
      fallback: result.fallback,
    });

    if (postId && url) {
      const sql = getDb();
      await sql`
        UPDATE posts SET image_url = ${url}
        WHERE id = ${postId} AND user_id = ${user.id}
      `;
    }

    const usage = await getUsage(user.id);
    return NextResponse.json({
      url,
      fallback: result.fallback,
      reason: result.reason,
      usage,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
