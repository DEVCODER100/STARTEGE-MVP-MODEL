import dns from "node:dns/promises";
import net from "node:net";

// ─── SSRF guard ─────────────────────────────────────────────────────────────
// Before the server fetches any user-supplied URL, resolve its hostname and
// reject private / loopback / link-local / reserved targets. This blocks
// cloud metadata endpoints (169.254.169.254), localhost, and internal ranges.

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map((n) => parseInt(n, 10));
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true; // fail closed
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this" network
  if (a === 169 && b === 254) return true; // link-local (metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::1" || s === "::") return true; // loopback / unspecified
  if (s.startsWith("fc") || s.startsWith("fd")) return true; // unique local
  if (s.startsWith("fe80")) return true; // link-local
  // IPv4-mapped (::ffff:a.b.c.d) → validate the embedded v4.
  const mapped = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) return isPrivateIPv4(ip);
  if (v === 6) return isPrivateIPv6(ip);
  return true; // not a valid IP → block
}

/**
 * Throws if the URL is not a public http/https host. Resolves every A/AAAA
 * record and blocks if ANY of them is private (defends against DNS records
 * that return multiple addresses).
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  // Literal IP host → check directly.
  if (net.isIP(u.hostname)) {
    if (isBlockedAddress(u.hostname)) throw new Error("Blocked host");
    return u;
  }
  const records = await dns.lookup(u.hostname, { all: true });
  if (records.length === 0) throw new Error("Host did not resolve");
  for (const { address } of records) {
    if (isBlockedAddress(address)) throw new Error("Blocked host");
  }
  return u;
}

/**
 * fetch() that follows redirects manually, re-validating every hop against the
 * SSRF guard. Prevents a public host from 3xx-redirecting to an internal one.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  maxRedirects = 4
): Promise<Response> {
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}
