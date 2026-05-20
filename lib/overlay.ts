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
const ACCENT = "#0F8A60";

let _registered = false;
function ensureFont() {
  if (_registered) return;
  GlobalFonts.register(Buffer.from(ANTON_TTF_BASE64, "base64"), FONT_FAMILY);
  _registered = true;
}

// ─── helpers ──────────────────────────────────────────────────────────────

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

/** Pick a headline font size that fits in <= maxLines lines. */
function fitHeadline(
  ctx: SKRSContext2D,
  text: string,
  startSize: number,
  minSize: number,
  maxWidth: number,
  maxLines = 4
) {
  let size = startSize;
  let lines = wrap(ctx, text, size, maxWidth);
  while (lines.length > maxLines && size > minSize) {
    size -= 4;
    lines = wrap(ctx, text, size, maxWidth);
  }
  return { size, lines, lineHeight: Math.round(size * 1.14) };
}

/** Draw a teal pill containing the CTA text. Returns the pill bounding box. */
function drawPill(
  ctx: SKRSContext2D,
  cx: number, // center anchor X (or left anchor if align="left")
  topY: number,
  text: string,
  fontPx: number,
  align: "center" | "left" = "center"
) {
  ctx.font = `${fontPx}px ${FONT_FAMILY}`;
  const tw = ctx.measureText(text).width;
  const padX = Math.round(fontPx * 1.05);
  const padY = Math.round(fontPx * 0.55);
  const w = Math.round(tw) + padX * 2;
  const h = fontPx + padY * 2;
  const x = align === "center" ? cx - w / 2 : cx;
  const r = h / 2;

  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.moveTo(x + r, topY);
  ctx.arcTo(x + w, topY, x + w, topY + h, r);
  ctx.arcTo(x + w, topY + h, x, topY + h, r);
  ctx.arcTo(x, topY + h, x, topY, r);
  ctx.arcTo(x, topY, x + w, topY, r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  const textX = align === "center" ? cx : x + padX;
  ctx.fillText(text, textX, topY + h / 2 + fontPx * 0.34);

  return { w, h };
}

/** Draw a multi-line headline. */
function drawHeadline(
  ctx: SKRSContext2D,
  lines: string[],
  size: number,
  lineHeight: number,
  x: number,
  topY: number,
  align: "center" | "left" = "center"
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, x, topY + size + i * lineHeight);
  });
}

// ─── layout variants ──────────────────────────────────────────────────────

type Variant = "bottom" | "top" | "band" | "left";
const VARIANTS: Variant[] = ["bottom", "top", "band", "left"];

// 1) Bottom: bottom-scrim + centered headline + pill below.
function drawBottom(
  ctx: SKRSContext2D,
  W: number,
  H: number,
  headline: string,
  cta: string
) {
  const margin = Math.round(W * 0.07);
  const maxW = W - margin * 2;
  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.082),
    Math.round(W * 0.046),
    maxW
  );

  const ctaSize = Math.round(W * 0.042);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.045) : 0;
  const blockH =
    (headline ? lines.length * lineHeight : 0) + (cta ? ctaH + gap : 0);

  const bottomMargin = Math.round(W * 0.085);
  const blockTop = H - bottomMargin - blockH;
  const scrimTop = Math.max(0, blockTop - Math.round(H * 0.16));
  const cx = Math.round(W / 2);

  const g = ctx.createLinearGradient(0, scrimTop, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, blockTop);
  if (cta) {
    const pillY = blockTop + (headline ? lines.length * lineHeight + gap : 0);
    drawPill(ctx, cx, pillY, cta, ctaSize);
  }
}

// 2) Top: top-scrim + centered headline near the top.
function drawTop(
  ctx: SKRSContext2D,
  W: number,
  H: number,
  headline: string,
  cta: string
) {
  const margin = Math.round(W * 0.07);
  const maxW = W - margin * 2;
  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.082),
    Math.round(W * 0.046),
    maxW
  );

  const ctaSize = Math.round(W * 0.042);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.045) : 0;
  const blockH =
    (headline ? lines.length * lineHeight : 0) + (cta ? ctaH + gap : 0);

  const topMargin = Math.round(W * 0.1);
  const blockTop = topMargin;
  const scrimBottom = Math.min(H, blockTop + blockH + Math.round(H * 0.1));
  const cx = Math.round(W / 2);

  const g = ctx.createLinearGradient(0, 0, 0, scrimBottom);
  g.addColorStop(0, "rgba(0,0,0,0.82)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, scrimBottom);

  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, blockTop);
  if (cta) {
    const pillY = blockTop + (headline ? lines.length * lineHeight + gap : 0);
    drawPill(ctx, cx, pillY, cta, ctaSize);
  }
}

// 3) Band: a solid dark band horizontally across (slightly above center).
function drawBand(
  ctx: SKRSContext2D,
  W: number,
  H: number,
  headline: string,
  cta: string
) {
  const margin = Math.round(W * 0.07);
  const maxW = W - margin * 2;
  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.088),
    Math.round(W * 0.05),
    maxW,
    3
  );

  const ctaSize = Math.round(W * 0.042);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.045) : 0;
  const blockH =
    (headline ? lines.length * lineHeight : 0) + (cta ? ctaH + gap : 0);

  const bandPadV = Math.round(H * 0.055);
  const bandH = blockH + bandPadV * 2;
  const bandTop = Math.round(H * 0.52) - bandH / 2;
  const cx = Math.round(W / 2);

  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(0, bandTop, W, bandH);

  const blockTop = bandTop + bandPadV;
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, blockTop);
  if (cta) {
    const pillY = blockTop + (headline ? lines.length * lineHeight + gap : 0);
    drawPill(ctx, cx, pillY, cta, ctaSize);
  }
}

// 4) Left: vertical gradient on the left + left-aligned headline.
function drawLeft(
  ctx: SKRSContext2D,
  W: number,
  H: number,
  headline: string,
  cta: string
) {
  const margin = Math.round(W * 0.07);
  const maxW = Math.round(W * 0.5);
  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.07),
    Math.round(W * 0.044),
    maxW,
    5
  );

  const ctaSize = Math.round(W * 0.04);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.04) : 0;
  const blockH =
    (headline ? lines.length * lineHeight : 0) + (cta ? ctaH + gap : 0);

  const blockTop = Math.round(H / 2 - blockH / 2);

  const g = ctx.createLinearGradient(0, 0, Math.round(W * 0.75), 0);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, Math.round(W * 0.75), H);

  if (headline)
    drawHeadline(ctx, lines, size, lineHeight, margin, blockTop, "left");
  if (cta) {
    const pillY = blockTop + (headline ? lines.length * lineHeight + gap : 0);
    drawPill(ctx, margin, pillY, cta, ctaSize, "left");
  }
}

// ─── public API ───────────────────────────────────────────────────────────

/**
 * Returns a JPEG buffer = base image + headline + optional CTA pill.
 * A layout variant is picked at random so every generation looks distinct.
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

  const variant: Variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
  switch (variant) {
    case "top":
      drawTop(ctx, W, H, headline, cta);
      break;
    case "band":
      drawBand(ctx, W, H, headline, cta);
      break;
    case "left":
      drawLeft(ctx, W, H, headline, cta);
      break;
    case "bottom":
    default:
      drawBottom(ctx, W, H, headline, cta);
      break;
  }

  return await canvas.encode("jpeg", 90);
}
