import { getDb } from "./db";

// ─── Jailbreak detection ──────────────────────────────────────────────────
// Patterns are intentionally broad. We detect (return reason) BEFORE we
// sanitize, so we can log the original attempt and respond firmly.

interface Pattern {
  re: RegExp;
  reason: string;
}

// `i` only — never `g` (stateful match.lastIndex bites with .test()).
const PATTERNS: Pattern[] = [
  { re: /ignore\s+(all\s+|previous\s+)?(instructions|rules|prompt)/i, reason: "ignore_instructions" },
  { re: /forget\s+(all\s+|previous\s+)?(instructions|rules|prompt)/i, reason: "forget_instructions" },
  { re: /disregard\s+(all\s+|previous\s+)?(instructions|rules|prompt)/i, reason: "disregard_instructions" },
  { re: /you\s+are\s+now\b/i, reason: "role_change" },
  { re: /pretend\s+(you\s+are|to\s+be)\b/i, reason: "pretend" },
  { re: /\bact\s+as\s+(?!a\s+marketer|a\s+marketing|a\s+coach|a\s+strategist|my\s+marketer)/i, reason: "act_as" },
  { re: /\brole-?play\b/i, reason: "roleplay" },
  { re: /\bjailbreak\b/i, reason: "jailbreak" },
  { re: /\bDAN\s+mode\b/i, reason: "dan_mode" },
  { re: /\bdeveloper\s+mode\b/i, reason: "developer_mode" },
  { re: /\bgod\s+mode\b/i, reason: "god_mode" },
  { re: /reveal\s+(your\s+)?(instructions|prompt|rules|system)/i, reason: "reveal_prompt" },
  { re: /(show|print|repeat|output)\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)/i, reason: "leak_prompt" },
  { re: /\bsystem\s+prompt\b/i, reason: "mention_system_prompt" },
  { re: /\boverride\s+(your\s+)?(safety|rules|instructions)/i, reason: "override_safety" },
  { re: /\bbypass\s+(your\s+)?(safety|rules|filter|restrictions)/i, reason: "bypass_safety" },
];

export interface SecurityCheck {
  isAttempt: boolean;
  reason: string | null;
  sanitized: string;
}

const MAX_INPUT_LEN = 4000;

/**
 * Run all checks in one pass. Returns:
 *   - isAttempt: true if any pattern matched the original input
 *   - reason:    the first matched reason, for logging
 *   - sanitized: input with matched substrings replaced by [removed], capped to MAX_INPUT_LEN
 */
export function inspect(rawInput: string): SecurityCheck {
  const input = (rawInput ?? "").toString();
  let reason: string | null = null;
  let sanitized = input;

  for (const { re, reason: r } of PATTERNS) {
    if (re.test(sanitized)) {
      if (!reason) reason = r;
      sanitized = sanitized.replace(new RegExp(re.source, re.flags + "g"), "[removed]");
    }
  }

  // Trim and clip.
  sanitized = sanitized.trim().slice(0, MAX_INPUT_LEN);

  return { isAttempt: reason !== null, reason, sanitized };
}

// Backward-compat thin wrappers — keep old call sites working.
export function sanitize(input: string): string {
  return inspect(input).sanitized;
}
export function isJailbreakAttempt(input: string): boolean {
  return inspect(input).isAttempt;
}

// ─── Security log ─────────────────────────────────────────────────────────
export async function logSecurityEvent(
  userId: string | null,
  input: string,
  reason: string
): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO security_logs (user_id, input, reason)
      VALUES (${userId}, ${input.slice(0, 2000)}, ${reason})
    `;
  } catch {
    // Never let logging take down the request.
  }
}

// ─── Rate limiting (in-memory token bucket per user+key) ─────────────────
// Sufficient for single-instance dev/prod. For multi-instance, swap to
// Upstash Redis or Vercel KV later.

interface Bucket {
  tokens: number;
  refillRatePerMs: number;
  capacity: number;
  lastRefill: number;
}

const BUCKETS = new Map<string, Bucket>();

function bucketKey(scope: string, id: string) {
  return `${scope}:${id}`;
}

/**
 * Token-bucket rate limiter.
 *   capacity: burst size
 *   windowMs: time to fully refill the bucket
 * Returns { ok, remaining, retryAfterMs }.
 */
export function rateLimit(
  scope: string,
  id: string,
  capacity: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const key = bucketKey(scope, id);
  const now = Date.now();
  const refillRatePerMs = capacity / windowMs;

  let b = BUCKETS.get(key);
  if (!b) {
    b = { tokens: capacity, refillRatePerMs, capacity, lastRefill: now };
    BUCKETS.set(key, b);
  }

  // Refill
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillRatePerMs);
    b.lastRefill = now;
  }

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return {
      ok: true,
      remaining: Math.floor(b.tokens),
      retryAfterMs: 0,
    };
  }

  const tokensNeeded = 1 - b.tokens;
  const retryAfterMs = Math.ceil(tokensNeeded / b.refillRatePerMs);
  return { ok: false, remaining: 0, retryAfterMs };
}

// Convenience wrappers for the limits called for in spec.
export const limits = {
  // Chat: 20 messages per minute
  chat: (userId: string) => rateLimit("chat", userId, 20, 60_000),
  // Campaign generation: 10 per hour
  generation: (userId: string) => rateLimit("gen", userId, 10, 60 * 60_000),
  // Login attempts: 5 per 15 min (for endpoints we own)
  login: (ipOrId: string) => rateLimit("login", ipOrId, 5, 15 * 60_000),
};
