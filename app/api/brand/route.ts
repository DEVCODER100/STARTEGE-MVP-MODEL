import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    return NextResponse.json({ user, profile: rows[0] ?? null });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
