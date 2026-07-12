import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/chats/[id] — full chat with messages
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getOrCreateUser();
    const sql = getDb();
    const chats = await sql`
      SELECT * FROM chats WHERE id = ${params.id} AND user_id = ${user.id} LIMIT 1
    `;
    if (chats.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const messages = await sql`
      SELECT id, role, content, image_url, image_meta, actions, created_at
      FROM chat_messages
      WHERE chat_id = ${params.id}
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ chat: chats[0], messages });
  } catch (e: unknown) {
    return errorJson(e);
  }
}

// DELETE /api/chats/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getOrCreateUser();
    const sql = getDb();
    await sql`
      DELETE FROM chats WHERE id = ${params.id} AND user_id = ${user.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
