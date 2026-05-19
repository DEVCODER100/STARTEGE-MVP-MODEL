// Allow chat messages to carry a generated image. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
await sql.query(
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text`
);
console.log("✓ chat_messages.image_url added");
