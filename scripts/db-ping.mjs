// Quick connectivity test. Usage: npm run db:ping
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const [{ now, version }] = await sql`SELECT now() as now, version() as version`;
console.log("✓ Connected:", now);
console.log("  ", version);
