import sharp from "sharp";
import { ANTON_TTF_BASE64 } from "./font-data";

// Compose a text layer onto an AI-generated (text-free) image.
// The font is embedded directly in the SVG via @font-face base64 — so text
// rendering has ZERO dependency on system fonts, files, or network. If it
// renders locally it renders identically on any server (incl. Vercel).

export interface OverlayText {
  headline?: string | null;
  cta?: string | null;
}

const FONT_FAMILY = "Anton"; // heavy display font — ideal for ad headlines

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
    ? Math.round(cta.length * ctaSize * 0.58) + ctaPadX * 2
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

  // Font embedded as @font-face base64 — librsvg (Sharp's SVG engine) renders
  // it with no system-font dependency.
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face {
          font-family: '${FONT_FAMILY}';
          src: url(data:font/ttf;base64,${ANTON_TTF_BASE64});
        }
      </style>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.78"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${scrimTop}" width="${W}" height="${H - scrimTop}" fill="url(#scrim)"/>
    ${headlineSvg}
    ${ctaSvg}
  </svg>`;

  return img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
