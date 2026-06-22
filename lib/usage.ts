import { getDb } from "./db";

// ─── MVP daily limits ─────────────────────────────────────────────────────
// Stratège is in MVP testing — no payments yet. These caps keep API spend
// predictable while founders test the product.
export const MVP_LIMITS = {
  posts: 10, // text generations per day
  images: null, // Unlimited during MVP image testing.
} as const;

export const MVP_LIMIT_MESSAGE =
  "You've reached today's free limit — nice work getting through it. Everything resets tomorrow, so come back then and pick up right where you left off. Limits stay small during early access so every creation comes back fast and reliable for you.";

function today(): string {
  // YYYY-MM-DD in the server's local time. Good enough for MVP.
  return new Date().toISOString().slice(0, 10);
}

export interface UsageSnapshot {
  posts: { used: number; limit: number; remaining: number };
  images: { used: number; limit: null; remaining: null };
}

export async function getUsage(userId: string): Promise<UsageSnapshot> {
  const sql = getDb();
  const rows = await sql`
    SELECT post_count, image_count
    FROM daily_usage
    WHERE user_id = ${userId} AND day = ${today()}
    LIMIT 1
  `;
  const post = rows[0]?.post_count ?? 0;
  const image = rows[0]?.image_count ?? 0;
  return {
    posts: {
      used: post,
      limit: MVP_LIMITS.posts,
      remaining: Math.max(0, MVP_LIMITS.posts - post),
    },
    images: {
      used: image,
      limit: MVP_LIMITS.images,
      remaining: null,
    },
  };
}

export async function canGeneratePost(userId: string): Promise<boolean> {
  const u = await getUsage(userId);
  return u.posts.remaining > 0;
}

export async function canGenerateImage(userId: string): Promise<boolean> {
  // Image generation is unlimited during MVP testing.
  void userId;
  return true;
}

// Atomically +1 the post counter. Returns the new count.
export async function consumePost(userId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO daily_usage (user_id, day, post_count)
    VALUES (${userId}, ${today()}, 1)
    ON CONFLICT (user_id, day)
    DO UPDATE SET post_count = daily_usage.post_count + 1
    RETURNING post_count
  `;
  return rows[0].post_count as number;
}

export async function consumeImage(userId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO daily_usage (user_id, day, image_count)
    VALUES (${userId}, ${today()}, 1)
    ON CONFLICT (user_id, day)
    DO UPDATE SET image_count = daily_usage.image_count + 1
    RETURNING image_count
  `;
  return rows[0].image_count as number;
}
