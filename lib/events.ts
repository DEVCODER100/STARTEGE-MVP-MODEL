import { getDb } from "./db";

// Who can see the /admin dashboard.
export const ADMIN_EMAILS = ["dg19121912@gmail.com"];

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export type EventType =
  | "login"
  | "signup"
  | "voice_saved"
  | "post_generated"
  | "angle_regenerated"
  | "angle_copied"
  | "image_generated"
  | "image_downloaded"
  | "limit_hit";

/**
 * Fire-and-forget behaviour log. Never throws — analytics must not break UX.
 */
export async function logEvent(
  userId: string | null,
  type: EventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO events (user_id, type, metadata)
      VALUES (
        ${userId},
        ${type},
        ${metadata ? JSON.stringify(metadata) : null}::jsonb
      )
    `;
  } catch {
    // swallow
  }
}
