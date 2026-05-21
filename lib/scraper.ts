import * as cheerio from "cheerio";
import { createCanvas, loadImage } from "@napi-rs/canvas";

export type ScrapedBrand = {
  url: string;
  brand_name: string | null;
  product: string | null;
  description: string | null;
  ogImage: string | null;
  headings: string[];
  brand_colors: string | null;
};

// ─── brand-color detection ─────────────────────────────────────────────────

function normHex(input: string): string | null {
  const c = input.trim();
  const hex = c.match(/^#?([0-9a-f]{6})$/i) || c.match(/^#?([0-9a-f]{3})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    return "#" + h.toUpperCase();
  }
  const rgb = c.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (rgb) {
    return (
      "#" +
      [rgb[1], rgb[2], rgb[3]]
        .map((n) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }
  return null;
}

/** A "vivid" color = a real brand color, not white/black/gray background or text. */
function isVivid(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (max + min) / 2 / 255;
  return sat > 0.28 && lum > 0.12 && lum < 0.9;
}

/** Near-white — never usable as an accent (it would vanish on a light card). */
function tooLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.88;
}

/** Most frequent vivid color from a list of color strings. */
function mostFrequentVivid(colors: string[]): string | null {
  const counts = new Map<string, number>();
  for (const raw of colors) {
    const hex = normHex(raw);
    if (hex && isVivid(hex)) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  counts.forEach((n, c) => {
    if (n > max) {
      max = n;
      best = c;
    }
  });
  return best;
}

/** Scan inline <style> blocks and style="" attributes for color values. */
function colorsFromCss($: ReturnType<typeof cheerio.load>): string[] {
  const styleText = $("style")
    .map((_, el) => $(el).text())
    .get()
    .join(" ");
  const styleAttrs = $("[style]")
    .map((_, el) => $(el).attr("style") ?? "")
    .get()
    .join(" ");
  const blob = `${styleText} ${styleAttrs}`;
  const hexes = blob.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  const rgbs = blob.match(/rgba?\([^)]+\)/g) ?? [];
  return [...hexes, ...rgbs];
}

/** Dominant vivid color of an image (e.g. the og:image) via pixel sampling. */
async function dominantColorFromImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const img = await loadImage(Buffer.from(await res.arrayBuffer()));
    const N = 48;
    const canvas = createCanvas(N, N);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, N, N);
    const { data } = ctx.getImageData(0, 0, N, N);
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const hex =
        "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
      if (!isVivid(hex)) continue;
      // quantize to reduce noise
      const q =
        "#" +
        [r, g, b].map((n) => ((n >> 5) << 5).toString(16).padStart(2, "0")).join("").toUpperCase();
      counts.set(q, (counts.get(q) ?? 0) + 1);
    }
    let best: string | null = null;
    let max = 0;
    counts.forEach((n, c) => {
      if (n > max) {
        max = n;
        best = c;
      }
    });
    return best;
  } catch {
    return null;
  }
}

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  // strip trailing slash for cleanliness
  return u.replace(/\/+$/, "");
}

function fallbackFromUrl(url: string, reason?: string): ScrapedBrand {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const label = host.split(".")[0] || host;
  const brand = label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    url,
    brand_name: brand || host,
    product: reason
      ? `Website connected, but detailed scraping was blocked (${reason}).`
      : "Website connected. Add product details in the next step.",
    description: null,
    ogImage: null,
    headings: [],
    brand_colors: null,
  };
}

function pick<T>(arr: (T | undefined | null | "")[]): T | null {
  for (const v of arr) if (v) return v as T;
  return null;
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapedBrand> {
  const url = normalizeUrl(rawUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: {
        // Some sites block bot-looking requests. This intentionally looks like
        // a normal browser navigation, not an API client.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (e: unknown) {
    const reason = e instanceof Error ? e.message : "network error";
    return fallbackFromUrl(url, reason);
  }

  if (!res.ok) {
    return fallbackFromUrl(url, `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType && !contentType.includes("text/html")) {
    return fallbackFromUrl(url, "not an HTML page");
  }

  const html = await res.text();
  if (!html.trim()) return fallbackFromUrl(url, "empty response");

  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() || "";

  const headings = $("h1, h2")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((s) => s.length > 0 && s.length < 200)
    .slice(0, 6);

  // Brand color — try several signals, strongest first:
  //   1. theme-color / tile-color meta tags
  //   2. most frequent vivid color in inline CSS
  //   3. dominant vivid color of the og:image
  let brand_colors: string | null = null;
  const themeColor =
    $('meta[name="theme-color"]').attr("content")?.trim() ||
    $('meta[name="msapplication-TileColor"]').attr("content")?.trim() ||
    "";
  if (themeColor) {
    const n = normHex(themeColor);
    // Accept a dark or colored theme-color, but not near-white (unusable).
    if (n && !tooLight(n)) brand_colors = n;
  }
  if (!brand_colors) brand_colors = mostFrequentVivid(colorsFromCss($));
  if (!brand_colors && ogImage) {
    brand_colors = await dominantColorFromImage(ogImage);
  }

  const brand_name = pick<string>([ogSiteName, ogTitle?.split(" | ")[0], title?.split(" | ")[0]]);
  const product = pick<string>([description, headings[0]]);

  if (!brand_name && !product) return fallbackFromUrl(url, "no metadata found");

  return {
    url,
    brand_name,
    product,
    description: description || null,
    ogImage: ogImage || null,
    headings,
    brand_colors,
  };
}
