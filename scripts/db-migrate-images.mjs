// Creates the generated_images table (Image Studio creations).
// Run: node scripts/db-migrate-images.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS generated_images (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         text NOT NULL,
    headline    text,
    source      text,
    created_at  timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_generated_images_user ON generated_images(user_id, created_at DESC)`;

console.log("generated_images table ready.");
