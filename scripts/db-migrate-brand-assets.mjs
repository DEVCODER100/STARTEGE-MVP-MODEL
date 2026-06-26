// Creates the brand_assets table (Brand Book asset library).
// Run: node scripts/db-migrate-brand-assets.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS brand_assets (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_name            text NOT NULL,
    asset_type            text NOT NULL,
    asset_url             text NOT NULL,
    thumbnail_url         text,
    device_frame_default  text,
    width                 integer,
    height                integer,
    uploaded_at           timestamptz NOT NULL DEFAULT now(),
    last_used_at          timestamptz,
    use_count             integer NOT NULL DEFAULT 0
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_brand_assets_user ON brand_assets(user_id)`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_brand_assets_recency
  ON brand_assets(user_id, last_used_at DESC NULLS LAST, uploaded_at DESC)
`;

console.log("brand_assets table ready.");
