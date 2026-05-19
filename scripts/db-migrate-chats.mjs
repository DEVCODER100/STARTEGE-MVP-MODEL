// Add chats + chat_messages tables. Idempotent.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(`
  CREATE TABLE IF NOT EXISTS chats (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       text NOT NULL DEFAULT 'New chat',
    mode        text NOT NULL DEFAULT 'coach',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )
`);
await sql.query(
  `CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC)`
);

await sql.query(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('user','assistant')),
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
  )
`);
await sql.query(
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON chat_messages(chat_id, created_at)`
);

console.log("✓ chats + chat_messages tables ready");
