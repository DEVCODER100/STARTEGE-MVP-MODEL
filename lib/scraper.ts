import * as cheerio from "cheerio";

export type ScrapedBrand = {
  url: string;
  brand_name: string | null;
  product: string | null;
  description: string | null;
  ogImage: string | null;
  headings: string[];
  brand_colors: string | null;
};

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

  // Theme color from <meta name="theme-color">.
  const themeColor =
    $('meta[name="theme-color"]').attr("content")?.trim() || null;

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
    brand_colors: themeColor,
  };
}
