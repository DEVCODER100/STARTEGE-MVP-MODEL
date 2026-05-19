// Pivot: switch from Clerk to NextAuth.
// - Make clerk_id nullable (existing rows untouched)
// - Add password_hash, image columns
// - Add NextAuth's tables for OAuth account linking + sessions (JWT strategy
//   only needs `accounts` for OAuth user creation; we use JWT sessions).
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(`ALTER TABLE users ALTER COLUMN clerk_id DROP NOT NULL`);
await sql.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text`);
await sql.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS image text`);
await sql.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified timestamptz`);

// OAuth account links (used by NextAuth to remember "this email signed in via Google")
await sql.query(`
  CREATE TABLE IF NOT EXISTS auth_accounts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            text NOT NULL,
    provider_account_id text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_account_id)
  )
`);
await sql.query(
  `CREATE INDEX IF NOT EXISTS idx_auth_accounts_user ON auth_accounts(user_id)`
);

console.log("✓ users table prepared + auth_accounts ready");
