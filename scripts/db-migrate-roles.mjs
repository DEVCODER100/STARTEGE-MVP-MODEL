// Add `role` and `industry` columns to brand_profiles. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
await sql.query(`ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS role text`);
await sql.query(`ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS industry text`);
console.log("✓ added role + industry columns");
