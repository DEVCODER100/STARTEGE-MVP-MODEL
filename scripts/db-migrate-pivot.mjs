// Pivot: voice_profiles + posts tables. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(`
  CREATE TABLE IF NOT EXISTS voice_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    building_what   text,
    audience        text,
    voice_samples   text,                  -- raw paste from user (multiple posts concatenated)
    voice_source    text,                  -- "paste" | "twitter" | "linkedin"
    platforms       text[] DEFAULT ARRAY[]::text[],
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )
`);

await sql.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input           text NOT NULL,
    angle_bts       jsonb,                 -- { hook, body, why }
    angle_lesson    jsonb,
    angle_outcome   jsonb,
    picked_angle    text,                  -- "bts" | "lesson" | "outcome" | null
    posted_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
  )
`);
await sql.query(`
  CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC)
`);

console.log("✓ voice_profiles + posts tables ready");
