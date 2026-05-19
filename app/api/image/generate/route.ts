import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { generateImages } from "@/lib/ideogram";
import { limits } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  campaignId: z.string().uuid().optional(),
  prompt: z.string().min(10).max(2000),
  count: z.number().int().min(1).max(3).default(3),
});

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

    const { campaignId, prompt, count } = parsed.data;

    const result = await generateImages({ prompt, count });

    if (campaignId) {
      const sql = getDb();
      await sql`
        UPDATE campaigns
        SET image_urls = ${result.urls}
        WHERE id = ${campaignId} AND user_id = ${user.id}
      `;
    }

    return NextResponse.json({
      urls: result.urls,
      fallback: result.fallback,
      reason: result.reason,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
