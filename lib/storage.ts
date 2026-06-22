import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Store an image buffer and return a public URL.
 *  - When BLOB_READ_WRITE_TOKEN is set (production) → Vercel Blob.
 *  - Local dev fallback → public/generated/ (served statically by Next).
 */
export async function storeImage(
  buffer: Buffer,
  ext: "jpg" | "png" = "jpg"
): Promise<string> {
  const filename = `stratege-${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`images/${filename}`, buffer, {
      access: "public",
      contentType: ext === "png" ? "image/png" : "image/jpeg",
    });
    return blob.url;
  }

  // No blob token. On Vercel the filesystem is read-only — fail clearly.
  if (process.env.VERCEL) {
    throw new Error(
      "Image storage is not configured. Add a Vercel Blob store so BLOB_READ_WRITE_TOKEN is set, then redeploy."
    );
  }

  // Local dev only.
  const dir = join(process.cwd(), "public", "generated");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);
  return `/generated/${filename}`;
}

/**
 * SSRF guard: only allow image URLs that WE produced — local /generated paths
 * or Vercel Blob URLs. Anything else (arbitrary http hosts) is rejected before
 * we ever fetch it server-side.
 */
export function isAllowedImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/generated/")) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Load an image into a Buffer. Handles both remote URLs (http/https) and
 * local public paths (e.g. "/generated/xyz.jpg").
 */
export async function loadImageBuffer(url: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  // Local /generated/... path → read from the public directory.
  const rel = url.replace(/^\/+/, "");
  return readFile(join(process.cwd(), "public", rel));
}
