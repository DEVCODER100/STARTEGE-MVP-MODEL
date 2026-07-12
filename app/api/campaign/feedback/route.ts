import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  campaignId: z.string().uuid(),
  posted: z.boolean().optional(),
  feedback: z.enum(["orders", "likes", "nothing"]).optional(),
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
    const { campaignId, posted, feedback } = parsed.data;
    const sql = getDb();

    if (typeof posted === "boolean") {
      await sql`UPDATE campaigns SET posted = ${posted} WHERE id = ${campaignId} AND user_id = ${user.id}`;
    }
    if (feedback) {
      await sql`UPDATE campaigns SET feedback = ${feedback} WHERE id = ${campaignId} AND user_id = ${user.id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
