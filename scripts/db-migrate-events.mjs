// Behaviour tracking: events table. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(`
  CREATE TABLE IF NOT EXISTS events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
    type        text NOT NULL,
    metadata    jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
  )
`);
await sql.query(
  `CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(user_id, created_at DESC)`
);
await sql.query(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
await sql.query(
  `CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC)`
);

console.log("✓ events table ready");
