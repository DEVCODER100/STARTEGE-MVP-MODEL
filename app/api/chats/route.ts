import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/chats — list user's recent chats
export async function GET() {
  try {
    const user = await getOrCreateUser();
    const sql = getDb();
    const rows = await sql`
      SELECT id, title, mode, created_at, updated_at
      FROM chats
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
      LIMIT 30
    `;
    return NextResponse.json({ chats: rows });
  } catch (e: unknown) {
    return errorJson(e);
  }
}

// POST /api/chats — create a new chat
const Body = z.object({
  title: z.string().min(1).max(120).default("New chat"),
  mode: z.enum(["coach", "strategy", "create"]).default("coach"),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    const { title, mode } = parsed.success ? parsed.data : { title: "New chat", mode: "coach" as const };

    const sql = getDb();
    const rows = await sql`
      INSERT INTO chats (user_id, title, mode)
      VALUES (${user.id}, ${title}, ${mode})
      RETURNING id, title, mode, created_at, updated_at
    `;
    return NextResponse.json({ chat: rows[0] });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
