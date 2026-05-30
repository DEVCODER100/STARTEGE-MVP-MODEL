// Adds the creative-brief flow columns. Idempotent.
//   - chats.pending_brief  jsonb (open brief while we await user answers)
//   - chat_messages.actions jsonb (quick-reply chips rendered by the UI)
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(
  `ALTER TABLE chats         ADD COLUMN IF NOT EXISTS pending_brief jsonb`
);
await sql.query(
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS actions       jsonb`
);

console.log("✓ chats.pending_brief + chat_messages.actions added");
