// MVP usage limits: per-user daily counters. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(`
  CREATE TABLE IF NOT EXISTS daily_usage (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day         date NOT NULL,
    post_count  integer NOT NULL DEFAULT 0,
    image_count integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, day)
  )
`);
await sql.query(
  `CREATE INDEX IF NOT EXISTS idx_daily_usage_user_day ON daily_usage(user_id, day)`
);

// Posts: track an image_url so generated images attach to the post.
await sql.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text`);

console.log("✓ daily_usage table ready + posts.image_url added");
