// Store editable image overlay data on chat messages. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
await sql.query(
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_meta jsonb`
);
console.log("✓ chat_messages.image_meta added");
