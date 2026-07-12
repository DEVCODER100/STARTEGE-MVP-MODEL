import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { limits } from "@/lib/security";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    // Rate-limit by IP (best-effort)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = limits.login(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", retryAfterMs: rl.retryAfterMs },
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
    const email = parsed.data.email.toLowerCase();
    const name = parsed.data.name?.trim() || null;

    const sql = getDb();
    const existing = await sql`
      SELECT id, password_hash FROM users WHERE email = ${email} LIMIT 1
    `;
    if (existing[0]?.password_hash) {
      return NextResponse.json(
        { error: "An account with that email already exists. Try signing in." },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(parsed.data.password, 11);

    if (existing[0]) {
      // Row exists from OAuth — attach password.
      await sql`
        UPDATE users
        SET password_hash = ${hash}, name = COALESCE(${name}, name)
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO users (email, name, password_hash)
        VALUES (${email}, ${name}, ${hash})
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
