import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelist of editable columns + their schemas. Server-side validation only.
const FieldSchema = z.object({
  product: z.string().max(500).optional(),
  target_audience: z.string().max(200).optional(),
  platforms: z.array(z.string().max(50)).max(10).optional(),
  goal: z.string().max(50).optional(),
  usp: z.string().max(500).optional(),
  posting_time: z.string().max(50).optional(),
  content_style: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  whatsapp_enabled: z.boolean().optional(),
  brand_name: z.string().max(120).optional(),
  website: z.string().max(300).optional(),
  brand_colors: z.string().max(300).optional(),
  budget: z.string().max(50).optional(),
  country: z.string().max(80).optional(),
  role: z.string().max(80).optional(),
  industry: z.string().max(80).optional(),
  logo_url: z.string().max(2000).optional(),
  onboarding_complete: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json();
    const parsed = FieldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const keys = Object.keys(data) as (keyof typeof data)[];
    if (keys.length === 0) {
      return NextResponse.json({ error: "No fields provided" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      INSERT INTO brand_profiles (user_id)
      VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    // Column names are whitelisted by Zod; values are parameterized. One
    // atomic UPDATE instead of N round-trips (no partial-update window).
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => data[k]);
    await sql.query(
      `UPDATE brand_profiles SET ${setClause} WHERE user_id = $${keys.length + 1}`,
      [...values, user.id]
    );

    const rows = await sql`
      SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    return NextResponse.json({ profile: rows[0] });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
