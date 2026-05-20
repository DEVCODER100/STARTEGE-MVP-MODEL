import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { MANROPE_B64 } from "./font-data";

// Compose a designed MARKETING CARD: pastel background, editorial dark
// headline at the top, optional subhead + CTA, with the AI-generated
// subject image contained inside a rounded card in the lower portion.
// Notion / Stripe / clean-SaaS aesthetic — never a photo with text slapped
// across it.

export interface OverlayText {
  headline?: string | null;
  cta?: string | null;
}

const FONT = "Manrope";
const ACCENT = "#0F8A60";
const TEXT_DARK = "#141414";

let _registered = false;
function ensureFont() {
  if (_registered) return;
  GlobalFonts.register(Buffer.from(MANROPE_B64, "base64"), FONT);
  _registered = true;
}

// ─── helpers ──────────────────────────────────────────────────────────────

function wrap(
  ctx: SKRSContext2D,
  text: string,
  fontPx: number,
  maxWidth: number
): string[] {
  ctx.font = `${fontPx}px ${FONT}`;
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
  return { size, lines, lineHeight: Math.round(size * 1.12) };
}

/** Draw a rounded-rect path (no fill yet). */
function roundedRectPath(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw a CTA pill. */
function drawPill(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  text: string,
  fontPx: number,
  fill: string,
  textColor: string,
  align: "center" | "left" = "center"
) {
  ctx.font = `${fontPx}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const padX = Math.round(fontPx * 1.1);
  const padY = Math.round(fontPx * 0.55);
  const w = Math.round(tw) + padX * 2;
  const h = fontPx + padY * 2;
  const x = align === "center" ? cx - w / 2 : cx;
  ctx.fillStyle = fill;
  roundedRectPath(ctx, x, topY, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  const textX = align === "center" ? cx : x + padX;
  ctx.fillText(text, textX, topY + h / 2 + fontPx * 0.34);
}

function drawHeadline(
  ctx: SKRSContext2D,
  lines: string[],
  size: number,
  lineHeight: number,
  x: number,
  topY: number,
  color: string,
  align: "center" | "left" = "center"
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, x, topY + size + i * lineHeight);
  });
}

/** Draw a soft shadow behind a rounded card region (cheap blur via stacked rects). */
function dropShadow(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.save();
  ctx.fillStyle = "rgba(20,20,20,0.10)";
  roundedRectPath(ctx, x - 2, y + 8, w + 4, h + 4, r);
  ctx.fill();
  ctx.fillStyle = "rgba(20,20,20,0.06)";
  roundedRectPath(ctx, x - 6, y + 18, w + 12, h + 12, r + 2);
  ctx.fill();
  ctx.restore();
}

// ─── palettes (background + accent shades) ───────────────────────────────

interface Palette {
  bg: string;
  bgEdge: string; // slight gradient edge
  pillFill: string;
  pillText: string;
}
const PALETTES: Palette[] = [
  { bg: "#FBF6EF", bgEdge: "#F6E9D6", pillFill: "#141414", pillText: "#FFFFFF" }, // warm cream
  { bg: "#F4F1FB", bgEdge: "#E7DEFB", pillFill: ACCENT, pillText: "#FFFFFF" }, // soft lavender
  { bg: "#F0F4F0", bgEdge: "#DDEBE2", pillFill: ACCENT, pillText: "#FFFFFF" }, // soft mint
  { bg: "#FCF1ED", bgEdge: "#F8D9C8", pillFill: "#141414", pillText: "#FFFFFF" }, // peach
  { bg: "#F2F4F7", bgEdge: "#DCE3EB", pillFill: ACCENT, pillText: "#FFFFFF" }, // cool gray
  { bg: "#FFF8E7", bgEdge: "#FBEABF", pillFill: "#141414", pillText: "#FFFFFF" }, // pale yellow
];

// ─── layout variants ──────────────────────────────────────────────────────

type Variant = "card-bottom" | "card-top" | "split-right";
const VARIANTS: Variant[] = ["card-bottom", "card-bottom", "card-top", "split-right"];
// "card-bottom" appears twice — most reliable / most reference-like layout.

/** Paint a soft-gradient pastel background. */
function paintBackground(
  ctx: SKRSContext2D,
  W: number,
  H: number,
  pal: Palette
) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, pal.bg);
  g.addColorStop(1, pal.bgEdge);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Draw a contained subject image inside a rounded rect (cover-fit). */
function drawSubjectImage(
  ctx: SKRSContext2D,
  img: Awaited<ReturnType<typeof loadImage>>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  dropShadow(ctx, x, y, w, h, r);
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  // cover-fit: scale to fill area, center-crop
  const srcW = img.width;
  const srcH = img.height;
  const scale = Math.max(w / srcW, h / srcH);
  const dW = srcW * scale;
  const dH = srcH * scale;
  const dx = x + (w - dW) / 2;
  const dy = y + (h - dH) / 2;
  ctx.drawImage(img, dx, dy, dW, dH);
  ctx.restore();
}

// Variant A: headline + subhead top; image as a big rounded card bottom-center.
function layoutCardBottom(
  ctx: SKRSContext2D,
  img: Awaited<ReturnType<typeof loadImage>>,
  W: number,
  H: number,
  headline: string,
  cta: string,
  pal: Palette
) {
  paintBackground(ctx, W, H, pal);

  const margin = Math.round(W * 0.085);
  const maxTextW = W - margin * 2;

  // Image card sits in the lower portion. Reserve ~52% of H for the image area.
  const imgH = Math.round(H * 0.52);
  const imgW = W - margin * 2;
  const imgX = margin;
  const imgY = H - margin - imgH;

  // Headline sized to fit nicely above the image card.
  const topArea = imgY - margin;
  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.085),
    Math.round(W * 0.05),
    maxTextW,
    3
  );

  // Sub-CTA pill is optional; place between headline and image if present.
  const ctaSize = Math.round(W * 0.038);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const ctaGap = cta ? Math.round(W * 0.04) : 0;

  const blockH = lines.length * lineHeight + (cta ? ctaH + ctaGap : 0);
  // Vertically center the text block in the top area.
  const blockTop = Math.max(
    Math.round(W * 0.11),
    Math.round((topArea - blockH) / 2)
  );

  const cx = Math.round(W / 2);
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, blockTop, TEXT_DARK);

  if (cta) {
    const pillY = blockTop + lines.length * lineHeight + ctaGap;
    drawPill(ctx, cx, pillY, cta, ctaSize, pal.pillFill, pal.pillText);
  }

  drawSubjectImage(ctx, img, imgX, imgY, imgW, imgH, Math.round(W * 0.045));
}

// Variant B: image card on TOP; text on the bottom (inverted).
function layoutCardTop(
  ctx: SKRSContext2D,
  img: Awaited<ReturnType<typeof loadImage>>,
  W: number,
  H: number,
  headline: string,
  cta: string,
  pal: Palette
) {
  paintBackground(ctx, W, H, pal);

  const margin = Math.round(W * 0.085);
  const maxTextW = W - margin * 2;

  const imgH = Math.round(H * 0.5);
  const imgW = W - margin * 2;
  const imgX = margin;
  const imgY = margin;

  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.082),
    Math.round(W * 0.048),
    maxTextW,
    3
  );

  const ctaSize = Math.round(W * 0.038);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const ctaGap = cta ? Math.round(W * 0.04) : 0;
  const blockH = lines.length * lineHeight + (cta ? ctaH + ctaGap : 0);

  const textTop = imgY + imgH + Math.round(W * 0.07);
  const cx = Math.round(W / 2);

  drawSubjectImage(ctx, img, imgX, imgY, imgW, imgH, Math.round(W * 0.045));

  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, textTop, TEXT_DARK);

  if (cta) {
    const pillY = textTop + lines.length * lineHeight + ctaGap;
    drawPill(ctx, cx, pillY, cta, ctaSize, pal.pillFill, pal.pillText);
  }
  // Silence unused-warning in case blockH ever drifts unused
  void blockH;
}

// Variant C: text on LEFT, image as card on RIGHT (Stripe-style).
function layoutSplitRight(
  ctx: SKRSContext2D,
  img: Awaited<ReturnType<typeof loadImage>>,
  W: number,
  H: number,
  headline: string,
  cta: string,
  pal: Palette
) {
  paintBackground(ctx, W, H, pal);

  const margin = Math.round(W * 0.075);

  // Right-side image card occupies roughly the right 48% of width, full inner height.
  const imgW = Math.round(W * 0.48);
  const imgH = Math.round(H - margin * 2);
  const imgX = W - margin - imgW;
  const imgY = margin;

  // Left text column.
  const textX = margin;
  const textColW = imgX - margin - Math.round(W * 0.035);

  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.075),
    Math.round(W * 0.046),
    textColW,
    6
  );

  const ctaSize = Math.round(W * 0.036);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const ctaGap = cta ? Math.round(W * 0.04) : 0;
  const blockH = lines.length * lineHeight + (cta ? ctaH + ctaGap : 0);

  const blockTop = Math.round((H - blockH) / 2);

  drawSubjectImage(ctx, img, imgX, imgY, imgW, imgH, Math.round(W * 0.045));

  if (headline)
    drawHeadline(ctx, lines, size, lineHeight, textX, blockTop, TEXT_DARK, "left");

  if (cta) {
    const pillY = blockTop + lines.length * lineHeight + ctaGap;
    drawPill(ctx, textX, pillY, cta, ctaSize, pal.pillFill, pal.pillText, "left");
  }
}

// ─── public API ───────────────────────────────────────────────────────────

/**
 * Returns a JPEG buffer of a designed marketing card.
 * Each call picks a random palette + layout variant for visual variety.
 */
export async function compositeText(
  baseImage: Buffer,
  text: OverlayText
): Promise<Buffer> {
  ensureFont();

  const img = await loadImage(baseImage);

  // Canvas is fixed 1080x1350 (Instagram portrait) so the marketing-card
  // design is consistent regardless of source-image aspect.
  const W = 1080;
  const H = 1350;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const headline = (text.headline ?? "").trim();
  const cta = (text.cta ?? "").trim().toUpperCase();
  const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];

  // If there's no text at all just paint the background and place the image full-bleed.
  if (!headline && !cta) {
    paintBackground(ctx, W, H, pal);
    const m = Math.round(W * 0.06);
    drawSubjectImage(ctx, img, m, m, W - m * 2, H - m * 2, Math.round(W * 0.04));
    return await canvas.encode("jpeg", 92);
  }

  const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
  switch (variant) {
    case "card-top":
      layoutCardTop(ctx, img, W, H, headline, cta, pal);
      break;
    case "split-right":
      layoutSplitRight(ctx, img, W, H, headline, cta, pal);
      break;
    case "card-bottom":
    default:
      layoutCardBottom(ctx, img, W, H, headline, cta, pal);
      break;
  }

  return await canvas.encode("jpeg", 92);
}
