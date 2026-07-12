import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — return the user's voice profile (or null)
export async function GET() {
  try {
    const user = await getOrCreateUser();
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM voice_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    return NextResponse.json({ profile: rows[0] ?? null });
  } catch (e: unknown) {
    return errorJson(e);
  }
}

// POST — upsert voice profile
const Body = z.object({
  building_what: z.string().max(500).optional(),
  audience: z.string().max(500).optional(),
  voice_samples: z.string().max(20000).optional(),
  voice_source: z.enum(["paste", "twitter", "linkedin"]).optional(),
  platforms: z.array(z.enum(["twitter", "linkedin"])).max(2).optional(),
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
    const data = parsed.data;
    const sql = getDb();

    await sql`
      INSERT INTO voice_profiles (
        user_id, building_what, audience, voice_samples, voice_source, platforms
      )
      VALUES (
        ${user.id},
        ${data.building_what ?? null},
        ${data.audience ?? null},
        ${data.voice_samples ?? null},
        ${data.voice_source ?? "paste"},
        ${data.platforms ?? []}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        building_what = COALESCE(EXCLUDED.building_what, voice_profiles.building_what),
        audience      = COALESCE(EXCLUDED.audience,      voice_profiles.audience),
        voice_samples = COALESCE(EXCLUDED.voice_samples, voice_profiles.voice_samples),
        voice_source  = COALESCE(EXCLUDED.voice_source,  voice_profiles.voice_source),
        platforms     = COALESCE(EXCLUDED.platforms,     voice_profiles.platforms),
        updated_at    = now()
    `;
    const rows = await sql`
      SELECT * FROM voice_profiles WHERE user_id = ${user.id} LIMIT 1
    `;
    await logEvent(user.id, "voice_saved", {
      sampleLength: data.voice_samples?.length ?? 0,
      platforms: data.platforms ?? [],
    });
    return NextResponse.json({ profile: rows[0] });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
