import { getDb } from "./db";

// Credit balance lives on users.credits, keyed by the NextAuth users.id (uuid).
// (Historically keyed by clerk_id — that column is deprecated/nullable now.)

export async function getCredits(userId: string): Promise<number> {
  const sql = getDb();
  const result = await sql`SELECT credits FROM users WHERE id = ${userId} LIMIT 1`;
  return result[0]?.credits ?? 0;
}

// Atomically deduct — the WHERE guard prevents a balance going negative under
// concurrent requests. Returns false when the user can't afford `amount`.
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    UPDATE users
    SET credits = credits - ${amount}
    WHERE id = ${userId} AND credits >= ${amount}
    RETURNING credits
  `;
  return result.length > 0;
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  const sql = getDb();
  await sql`UPDATE users SET credits = credits + ${amount} WHERE id = ${userId}`;
}
