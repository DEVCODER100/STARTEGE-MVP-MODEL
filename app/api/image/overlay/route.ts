import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { reoverlayImage } from "@/lib/imagegen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Re-render the text layer on an already-generated image. Instant — the base
// (text-free) image is reused, only the SVG text is recomposited.
const Body = z.object({
  messageId: z.string().uuid(),
  baseUrl: z.string().min(3),
  headline: z.string().max(300).default(""),
  cta: z.string().max(60).default(""),
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
    const { messageId, baseUrl, headline, cta } = parsed.data;

    const sql = getDb();
    // Verify the message belongs to a chat owned by this user.
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

    const previousMeta = (owned[0]?.image_meta ?? {}) as {
      direction?: unknown;
    };
    const url = await reoverlayImage(
      baseUrl,
      headline.trim(),
      cta.trim(),
      previousMeta.direction as never
    );

    const meta = JSON.stringify({
      baseUrl,
      headline: headline.trim(),
      cta: cta.trim(),
      direction: previousMeta.direction ?? null,
    });
    await sql`
      UPDATE chat_messages
      SET image_url = ${url}, image_meta = ${meta}::jsonb
      WHERE id = ${messageId}
    `;

    return NextResponse.json({ url, headline: headline.trim(), cta: cta.trim() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
