import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM campaigns
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 30
    `;
    return NextResponse.json({ campaigns: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
