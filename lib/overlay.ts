import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { tmpdir } from "node:os";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Compose a text layer onto an AI-generated (text-free) image.
// Text is rendered with an EXPLICIT embedded font via resvg — so it works
// identically on any server (Vercel's Linux runtime has no system fonts).

export interface OverlayText {
  headline?: string | null;
  cta?: string | null;
}

// Anton — a heavy display font, great for ad headlines. Open Font License.
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/anton/Anton-Regular.ttf";
const FONT_FAMILY = "Anton";

// resvg-js loads fonts from file paths. We fetch the font once and cache it
// in the OS temp dir (writable on Vercel's Lambda runtime).
let _fontPath: string | null = null;

async function getFontPath(): Promise<string | null> {
  if (_fontPath) return _fontPath;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(FONT_URL, {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const p = join(tmpdir(), "stratege-anton.ttf");
        await writeFile(p, buf);
        _fontPath = p;
        return p;
      }
    } catch {
      // retry
    }
  }
  return null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Greedy word-wrap. Anton is condensed (~0.46em/char). */
function wrapLines(text: string, fontSize: number, maxWidth: number): string[] {
  const charW = fontSize * 0.46;
  const maxChars = Math.max(6, Math.floor(maxWidth / charW));
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Returns a JPEG buffer = base image + headline + optional CTA pill,
 * with a bottom scrim so text stays legible on any image.
 */
export async function compositeText(
  baseImage: Buffer,
  text: OverlayText
): Promise<Buffer> {
  const img = sharp(baseImage);
  const meta = await img.metadata();
  const W = meta.width ?? 1080;
  const H = meta.height ?? 1350;

  const headline = (text.headline ?? "").trim();
  const cta = (text.cta ?? "").trim();

  if (!headline && !cta) {
    return img.jpeg({ quality: 90 }).toBuffer();
  }

  const margin = Math.round(W * 0.07);
  const maxTextWidth = W - margin * 2;

  // Adaptive headline sizing
  let hSize = Math.round(W * 0.075);
  let hLines = wrapLines(headline, hSize, maxTextWidth);
  while (hLines.length > 4 && hSize > Math.round(W * 0.044)) {
    hSize -= 4;
    hLines = wrapLines(headline, hSize, maxTextWidth);
  }
  const hLineHeight = Math.round(hSize * 1.12);

  const ctaSize = Math.round(W * 0.038);
  const ctaPadX = Math.round(ctaSize * 1.0);
  const ctaPadY = Math.round(ctaSize * 0.5);
  const ctaH = ctaSize + ctaPadY * 2;
  const ctaW = cta
    ? Math.round(cta.length * ctaSize * 0.56) + ctaPadX * 2
    : 0;

  const gap = cta ? Math.round(W * 0.04) : 0;
  const blockH =
    (headline ? hLines.length * hLineHeight : 0) + (cta ? ctaH + gap : 0);

  const bottomMargin = Math.round(W * 0.085);
  const blockTop = H - bottomMargin - blockH;
  const scrimTop = Math.max(0, blockTop - Math.round(H * 0.14));
  const cx = Math.round(W / 2);

  const headlineSvg = headline
    ? `<text x="${cx}" y="${blockTop + hSize}" text-anchor="middle"
         font-family="${FONT_FAMILY}" font-size="${hSize}" fill="#FFFFFF">
        ${hLines
          .map(
            (ln, i) =>
              `<tspan x="${cx}" dy="${i === 0 ? 0 : hLineHeight}">${escapeXml(
                ln
              )}</tspan>`
          )
          .join("")}
       </text>`
    : "";

  let ctaSvg = "";
  if (cta) {
    const ctaY = blockTop + (headline ? hLines.length * hLineHeight + gap : 0);
    const ctaX = cx - ctaW / 2;
    ctaSvg = `
      <rect x="${ctaX}" y="${ctaY}" width="${ctaW}" height="${ctaH}"
        rx="${Math.round(ctaH / 2)}" fill="#0F8A60"/>
      <text x="${cx}" y="${ctaY + ctaH / 2 + ctaSize * 0.36}"
        text-anchor="middle" font-family="${FONT_FAMILY}"
        font-size="${ctaSize}" fill="#FFFFFF">
        ${escapeXml(cta.toUpperCase())}
      </text>`;
  }

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.78"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${scrimTop}" width="${W}" height="${H - scrimTop}" fill="url(#scrim)"/>
    ${headlineSvg}
    ${ctaSvg}
  </svg>`;

  // Render the SVG (incl. text) to a transparent PNG with an EXPLICIT font.
  const fontPath = await getFontPath();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: fontPath
      ? {
          fontFiles: [fontPath],
          loadSystemFonts: false,
          defaultFontFamily: FONT_FAMILY,
        }
      : { loadSystemFonts: true },
  });
  const overlayPng = resvg.render().asPng();

  return img
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
