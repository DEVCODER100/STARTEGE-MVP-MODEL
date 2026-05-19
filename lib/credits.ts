import { getDb } from "./db";

export async function getCredits(userId: string): Promise<number> {
  const sql = getDb();
  const result = await sql`SELECT credits FROM users WHERE clerk_id = ${userId}`;
  return result[0]?.credits ?? 0;
}

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    UPDATE users
    SET credits = credits - ${amount}
    WHERE clerk_id = ${userId} AND credits >= ${amount}
    RETURNING credits
  `;
  return result.length > 0;
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  const sql = getDb();
  await sql`UPDATE users SET credits = credits + ${amount} WHERE clerk_id = ${userId}`;
}
