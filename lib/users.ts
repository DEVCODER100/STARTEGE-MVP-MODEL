import { auth } from "@/auth";
import { getDb } from "./db";

/**
 * Get the local users row for the currently signed-in (NextAuth) user.
 * Throws if unauthenticated.
 *
 * Note: with NextAuth + our credentials/Google flow, the row is created at
 * signup/first-OAuth-login, so we just look it up here. We keep the name
 * `getOrCreateUser` for backward compatibility with all existing API routes.
 */
export async function getOrCreateUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const sql = getDb();
  const rows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
  if (rows[0]) return rows[0];

  // Defensive: if the session points to a missing user (deleted), surface it.
  throw new Error("Unauthenticated");
}
