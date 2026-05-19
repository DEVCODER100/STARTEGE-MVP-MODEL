import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _wrapped: NeonQueryFunction<false, false> | null = null;

// Neon free-tier compute auto-suspends when idle. The first query after a
// suspend can throw a transient "fetch failed" while the compute wakes.
// We retry those a few times so pages don't crash on a cold start.
const TRANSIENT =
  /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network|terminating connection|Connection terminated|EAI_AGAIN/i;

async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!TRANSIENT.test(msg) || i === tries - 1) throw e;
      // 300ms, 700ms, 1500ms backoff — covers a Neon cold start.
      await new Promise((r) => setTimeout(r, 300 + i * 400 + i * i * 200));
    }
  }
  throw lastErr;
}

// Wrap the neon sql function so BOTH call styles auto-retry:
//   sql`SELECT ...`         (tagged template)
//   sql.query(text, params) (parameterized)
function wrap(
  base: NeonQueryFunction<false, false>
): NeonQueryFunction<false, false> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tagged: any = (strings: TemplateStringsArray, ...values: unknown[]) =>
    retry(() => (base as any)(strings, ...values));
  tagged.query = (q: string, params?: unknown[]) =>
    retry(() => (base as any).query(q, params));
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return tagged as NeonQueryFunction<false, false>;
}

/**
 * Tagged-template SQL function backed by Neon over HTTP, with retry on
 * transient connection errors. Always interpolate values via the tagged
 * template — never concatenate strings.
 */
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (Neon connection string)."
    );
  }
  if (!_wrapped) {
    _wrapped = wrap(neon(process.env.DATABASE_URL));
  }
  return _wrapped;
}

export async function pingDb() {
  const sql = getDb();
  const rows = await sql`SELECT now() as now`;
  return rows[0]?.now as Date | string | undefined;
}
