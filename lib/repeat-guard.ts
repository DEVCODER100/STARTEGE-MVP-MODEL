import { getDb } from "./db";
import { isArchetype, type Archetype } from "./resolved-brief";

// Best-effort repeat guard: remember the last few archetypes a user's ads used
// so the same layout is never served twice in a row. Stored in the generic
// events table (type='archetype_pick') → zero migration, indexed by
// (user_id, created_at DESC). Never throws — a DB hiccup must not block an ad.

export async function recentArchetypes(userId: string, n = 3): Promise<Archetype[]> {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT metadata FROM events
      WHERE user_id = ${userId} AND type = 'archetype_pick'
      ORDER BY created_at DESC
      LIMIT ${n}
    `;
    return rows
      .map((r) => (r as { metadata?: { archetype?: unknown } }).metadata?.archetype)
      .filter(isArchetype);
  } catch {
    return [];
  }
}

export async function recordArchetype(userId: string, archetype: Archetype): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO events (user_id, type, metadata)
      VALUES (${userId}, 'archetype_pick', ${JSON.stringify({ archetype })}::jsonb)
    `;
  } catch {
    /* swallow — the guard is best-effort */
  }
}
