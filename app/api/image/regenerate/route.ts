import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { canGenerateImage, consumeImage, getUsage, MVP_LIMIT_MESSAGE } from "@/lib/usage";
import { editAd, type AdImageMeta } from "@/lib/ad-imagegen";
import { isColorCombo, type AdCopy } from "@/lib/ad-brief";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Regenerate an Ad Studio image with edited copy and/or color. Unlike the old
// /api/image/overlay (which only recomposited text), this calls Ideogram again,
// so it consumes a daily image generation.
const Body = z.object({
  messageId: z.string().uuid(),
  headline: z.string().max(60).optional(),
  subhead: z.string().max(90).optional(),
  cta: z.string().max(24).optional(),
  color: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { messageId, headline, subhead, cta, color } = parsed.data;

    const sql = getDb();
    const owned = await sql`
      SELECT m.id, m.image_meta
      FROM chat_messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = ${messageId} AND c.user_id = ${user.id}
      LIMIT 1
    `;
    if (owned.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const meta = owned[0].image_meta as AdImageMeta | null;
    if (!meta || meta.v !== 2 || !meta.copy) {
      return NextResponse.json(
        { error: "This image can't be regenerated." },
        { status: 400 }
      );
    }

    if (!(await canGenerateImage(user.id))) {
      await logEvent(user.id, "limit_hit", { limitType: "images" });
      return NextResponse.json(
        { error: MVP_LIMIT_MESSAGE, mvpLimit: true },
        { status: 429 }
      );
    }

    const brandRows = await sql`
      SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    const brand = brandRows[0] ?? {};

    const patchedCopy: AdCopy = {
      headline: (headline ?? meta.copy.headline).trim() || meta.copy.headline,
      subhead: (subhead ?? meta.copy.subhead).trim(),
      cta: (cta ?? meta.copy.cta).trim(),
    };
    const newColor = color && isColorCombo(color) ? color : undefined;

    const result = await editAd(brand, meta, patchedCopy, newColor);
    await consumeImage(user.id);
    await logEvent(user.id, "image_generated", {
      kind: "edit",
      fallback: result.fallback,
    });

    const newMeta: AdImageMeta = {
      ...meta,
      color: result.color,
      copy: result.copy,
      lever: result.lever,
    };
    await sql`
      UPDATE chat_messages
      SET image_url = ${result.url}, image_meta = ${JSON.stringify(newMeta)}::jsonb
      WHERE id = ${messageId}
    `;

    const usage = await getUsage(user.id);
    return NextResponse.json({ url: result.url, copy: result.copy, usage });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
