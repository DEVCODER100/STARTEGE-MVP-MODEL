import { NextResponse } from "next/server";

// Central error responder for API routes. Logs the real error server-side and
// returns a generic message to the client so DB/driver internals never leak.
// Preserves the "Unauthenticated" → 401 mapping every route relied on.
export function errorJson(
  e: unknown,
  opts: { fallback?: string; status?: number } = {}
): NextResponse {
  const isUnauth = e instanceof Error && e.message === "Unauthenticated";
  const status = isUnauth ? 401 : opts.status ?? 500;

  // Server-side visibility (never sent to the client).
  if (!isUnauth) {
    console.error("[api-error]", e instanceof Error ? e.stack ?? e.message : e);
  }

  const message = isUnauth
    ? "Unauthorized"
    : opts.fallback ?? "Something went wrong. Please try again.";
  return NextResponse.json({ error: message }, { status });
}
