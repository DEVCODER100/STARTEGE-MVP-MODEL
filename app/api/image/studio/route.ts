import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import {
  canGenerateImage,
  consumeImage,
  getUsage,
  MVP_LIMIT_MESSAGE,
} from "@/lib/usage";
import { generateFromDescription } from "@/lib/ad-imagegen";
import { isAllowedImageUrl } from "@/lib/storage";
import { isAdMode } from "@/lib/ad-brief";
import { limits } from "@/lib/security";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dual-input Image Studio: the textarea (palettes + styles + chips + free text)
// is the source of truth. Parse → merge with brand defaults → write copy →
// build prompt → Ideogram (generate, or remix when an exact-product photo is given).
const Body = z.object({
  description: z.string().min(1).max(2000),
  photoUrl: z.string().max(2000).optional(),
  mode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many generations — slow down a bit.", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { description } = parsed.data;
    const photoUrl =
      parsed.data.photoUrl && isAllowedImageUrl(parsed.data.photoUrl)
        ? parsed.data.photoUrl
        : undefined;
    const mode =
      parsed.data.mode && isAdMode(parsed.data.mode) ? parsed.data.mode : undefined;

    if (!(await canGenerateImage(user.id))) {
      await logEvent(user.id, "limit_hit", { limitType: "images" });
      return NextResponse.json(
        { error: MVP_LIMIT_MESSAGE, mvpLimit: true },
        { status: 429 }
      );
    }

    const sql = getDb();
    const brandRows = await sql`
      SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    const brand = brandRows[0] ?? {};

    const result = await generateFromDescription(
      brand,
      { description, photoUrl, mode },
      `${user.id}:${Date.now()}`
    );
    await consumeImage(user.id);
    await logEvent(user.id, "image_generated", {
      kind: "studio",
      fallback: result.fallback,
    });

    // Save to the Library (best-effort — never fail the request on this).
    try {
      await sql`
        INSERT INTO generated_images (user_id, url, headline, source)
        VALUES (${user.id}, ${result.url}, ${result.copy?.headline ?? null}, 'studio')
      `;
    } catch {
      /* ignore */
    }

    const usage = await getUsage(user.id);
    return NextResponse.json({
      url: result.url,
      copy: result.copy,
      fallback: result.fallback,
      usage,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
