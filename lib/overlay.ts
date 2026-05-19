import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { ANTON_TTF_BASE64 } from "./font-data";

// Compose a text layer onto an AI-generated (text-free) image.
// Text is drawn with @napi-rs/canvas using a font registered directly from
// an in-memory buffer — no SVG, no system fonts, no files. Renders
// identically on any machine, including Vercel's Linux runtime.

export interface OverlayText {
  headline?: string | null;
  cta?: string | null;
}

const FONT_FAMILY = "Anton"; // heavy display font — ideal for ad headlines

let _registered = false;
function ensureFont() {
  if (_registered) return;
  GlobalFonts.register(Buffer.from(ANTON_TTF_BASE64, "base64"), FONT_FAMILY);
  _registered = true;
}

/** Word-wrap using real measured text width. */
function wrap(
  ctx: SKRSContext2D,
  text: string,
  fontPx: number,
  maxWidth: number
): string[] {
  ctx.font = `${fontPx}px ${FONT_FAMILY}`;
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const cand = line ? `${line} ${w}` : w;
    if (ctx.measureText(cand).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = cand;
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
  ensureFont();

  const img = await loadImage(baseImage);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  const headline = (text.headline ?? "").trim();
  const cta = (text.cta ?? "").trim().toUpperCase();

  if (!headline && !cta) {
    return await canvas.encode("jpeg", 90);
  }

  const margin = Math.round(W * 0.07);
  const maxTextWidth = W - margin * 2;

  // Headline — shrink font until it fits in <= 4 lines.
  let hSize = Math.round(W * 0.082);
  let lines = headline ? wrap(ctx, headline, hSize, maxTextWidth) : [];
  while (lines.length > 4 && hSize > Math.round(W * 0.046)) {
    hSize -= 4;
    lines = wrap(ctx, headline, hSize, maxTextWidth);
  }
  const hLineHeight = Math.round(hSize * 1.14);

  // CTA pill — sized to the measured text.
  const ctaSize = Math.round(W * 0.042);
  ctx.font = `${ctaSize}px ${FONT_FAMILY}`;
  const ctaTextW = cta ? ctx.measureText(cta).width : 0;
  const ctaPadX = Math.round(ctaSize * 1.05);
  const ctaPadY = Math.round(ctaSize * 0.55);
  const ctaH = ctaSize + ctaPadY * 2;
  const ctaW = cta ? Math.round(ctaTextW) + ctaPadX * 2 : 0;

  const gap = cta ? Math.round(W * 0.045) : 0;
  const blockH = lines.length * hLineHeight + (cta ? ctaH + gap : 0);

  const bottomMargin = Math.round(W * 0.085);
  const blockTop = H - bottomMargin - blockH;
  const scrimTop = Math.max(0, blockTop - Math.round(H * 0.16));
  const cx = Math.round(W / 2);

  // Bottom scrim for legibility.
  const grad = ctx.createLinearGradient(0, scrimTop, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  // Headline
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${hSize}px ${FONT_FAMILY}`;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, cx, blockTop + hSize + i * hLineHeight);
  });

  // CTA pill
  if (cta) {
    const ctaY = blockTop + lines.length * hLineHeight + gap;
    const ctaX = cx - ctaW / 2;
    const r = ctaH / 2;
    ctx.fillStyle = "#0F8A60";
    ctx.beginPath();
    ctx.moveTo(ctaX + r, ctaY);
    ctx.arcTo(ctaX + ctaW, ctaY, ctaX + ctaW, ctaY + ctaH, r);
    ctx.arcTo(ctaX + ctaW, ctaY + ctaH, ctaX, ctaY + ctaH, r);
    ctx.arcTo(ctaX, ctaY + ctaH, ctaX, ctaY, r);
    ctx.arcTo(ctaX, ctaY, ctaX + ctaW, ctaY, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${ctaSize}px ${FONT_FAMILY}`;
    ctx.fillText(cta, cx, ctaY + ctaH / 2 + ctaSize * 0.34);
  }

  return await canvas.encode("jpeg", 90);
}
