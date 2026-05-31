import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import type { SKRSContext2D, Image } from "@napi-rs/canvas";
import { MANROPE_B64 } from "./font-data";
import type { CreativeDirection, VisualStyle } from "./creative-direction";

// Compose a finished marketing card from a text-free subject image + text.
// Six visually DISTINCT templates, picked with anti-repeat rotation, so two
// generations never look like the same template. The palette (brand identity)
// stays consistent; the composition changes dramatically.

export interface OverlayText {
  headline?: string | null;
  cta?: string | null;
  direction?: CreativeDirection | null;
  forceTemplate?: TemplateName | null;
}

const FONT = "Manrope";

let _registered = false;
function ensureFont() {
  if (_registered) return;
  GlobalFonts.register(Buffer.from(MANROPE_B64, "base64"), FONT);
  _registered = true;
}

type Img = Image;

// ─── color helpers ──────────────────────────────────────────────────────────

function lum(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function readableOn(hex: string): string {
  return lum(hex) > 0.6 ? "#141414" : "#FFFFFF";
}

// ─── text helpers ─────────────────────────────────────────────────────────

function wrap(ctx: SKRSContext2D, text: string, fontPx: number, maxW: number): string[] {
  ctx.font = `${fontPx}px ${FONT}`;
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const cand = line ? `${line} ${w}` : w;
    if (ctx.measureText(cand).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = cand;
  }
  if (line) lines.push(line);
  return lines;
}

function fitHeadline(
  ctx: SKRSContext2D,
  text: string,
  start: number,
  min: number,
  maxW: number,
  maxLines = 4
) {
  let size = start;
  let lines = wrap(ctx, text, size, maxW);
  while (lines.length > maxLines && size > min) {
    size -= 4;
    lines = wrap(ctx, text, size, maxW);
  }
  return { size, lines, lineHeight: Math.round(size * 1.12) };
}

function drawHeadline(
  ctx: SKRSContext2D,
  lines: string[],
  size: number,
  lh: number,
  x: number,
  topY: number,
  color: string,
  align: "center" | "left" = "center"
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  lines.forEach((ln, i) => ctx.fillText(ln, x, topY + size + i * lh));
}

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
  if (!text) return;
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
  ctx.fillText(text, align === "center" ? cx : x + padX, topY + h / 2 + fontPx * 0.34);
}

function drawImageCover(
  ctx: SKRSContext2D,
  img: Img,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  shadow = false
) {
  if (shadow) {
    ctx.save();
    ctx.fillStyle = "rgba(20,20,20,0.12)";
    roundedRectPath(ctx, x - 2, y + 10, w + 4, h + 6, r);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dW = img.width * scale;
  const dH = img.height * scale;
  ctx.drawImage(img, x + (w - dW) / 2, y + (h - dH) / 2, dW, dH);
  ctx.restore();
}

// ─── distinct CTA shapes ────────────────────────────────────────────────────
// Each template uses a DIFFERENT button so generations never share one look.

function btnMetrics(ctx: SKRSContext2D, text: string, fontPx: number, arrow: boolean) {
  ctx.font = `${fontPx}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const arrowW = arrow ? fontPx * 1.15 : 0;
  const padX = Math.round(fontPx * 1.0);
  const padY = Math.round(fontPx * 0.55);
  const w = Math.round(tw + arrowW) + padX * 2;
  const h = fontPx + padY * 2;
  return { tw, arrowW, padX, padY, w, h };
}

function drawArrow(ctx: SKRSContext2D, x: number, midY: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.16);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, midY);
  ctx.lineTo(x + size, midY);
  ctx.moveTo(x + size * 0.52, midY - size * 0.32);
  ctx.lineTo(x + size, midY);
  ctx.lineTo(x + size * 0.52, midY + size * 0.32);
  ctx.stroke();
  ctx.restore();
}

// Sharp/soft rectangle button, optional trailing arrow.
function drawRectButton(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  text: string,
  fontPx: number,
  fill: string,
  textColor: string,
  align: "center" | "left",
  radius: number,
  arrow = false
) {
  if (!text) return;
  const { padX, w, h } = btnMetrics(ctx, text, fontPx, arrow);
  const x = align === "center" ? cx - w / 2 : cx;
  ctx.fillStyle = fill;
  roundedRectPath(ctx, x, topY, w, h, Math.min(radius, h / 2));
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `${fontPx}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const ty = topY + h / 2 + fontPx * 0.34;
  ctx.fillText(text, x + padX, ty);
  if (arrow) {
    const ax = x + padX + ctx.measureText(text).width + fontPx * 0.4;
    drawArrow(ctx, ax, topY + h / 2, fontPx * 0.6, textColor);
  }
}

// Outline-only "ghost" button with sharp corners (no fill).
function drawGhostButton(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  text: string,
  fontPx: number,
  lineColor: string,
  align: "center" | "left" = "center"
) {
  if (!text) return;
  const { w, h } = btnMetrics(ctx, text, fontPx, false);
  const x = align === "center" ? cx - w / 2 : cx;
  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(2, Math.round(fontPx * 0.09));
  roundedRectPath(ctx, x, topY, w, h, Math.round(fontPx * 0.18));
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = lineColor;
  ctx.font = `${fontPx}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x + w / 2, topY + h / 2 + fontPx * 0.34);
}

// Text link with an underline and trailing arrow — no box at all.
function drawLinkCta(
  ctx: SKRSContext2D,
  x: number,
  topY: number,
  text: string,
  fontPx: number,
  color: string,
  align: "center" | "left"
) {
  if (!text) return;
  ctx.font = `${fontPx}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const arrowGap = fontPx * 0.45;
  const arrowSize = fontPx * 0.6;
  const left = align === "center" ? x - (tw + arrowGap + arrowSize) / 2 : x;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, left, topY + fontPx);
  ctx.fillRect(left, topY + fontPx * 1.28, tw, Math.max(2, Math.round(fontPx * 0.07)));
  drawArrow(ctx, left + tw + arrowGap, topY + fontPx * 0.55, arrowSize, color);
}

// ─── decorations ──────────────────────────────────────────────────────────

function drawDots(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  cols: number,
  rows: number,
  gap: number,
  r: number,
  color: string
) {
  ctx.fillStyle = color;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.beginPath();
      ctx.arc(x + i * gap, y + j * gap, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawVRule(ctx: SKRSContext2D, x: number, y: number, h: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Stroke a thin border just inside an image rect (for the framed look).
function strokeFrame(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  lineW: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  roundedRectPath(ctx, x + lineW / 2, y + lineW / 2, w - lineW, h - lineW, r);
  ctx.stroke();
  ctx.restore();
}

function paintBg(ctx: SKRSContext2D, W: number, H: number, a: string, b: string) {
  const r = Math.random();
  const g =
    r < 0.34
      ? ctx.createLinearGradient(0, 0, W, H)
      : r < 0.67
        ? ctx.createLinearGradient(0, 0, 0, H)
        : ctx.createLinearGradient(W, 0, 0, H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ─── palette ────────────────────────────────────────────────────────────────

interface Palette {
  bg: string;
  bgEdge: string;
  text: string;
  accent: string;
  pillFill: string;
  pillText: string;
}
const FALLBACK_PALETTES: Palette[] = [
  { bg: "#FBF6EF", bgEdge: "#F6E9D6", text: "#141414", accent: "#0F8A60", pillFill: "#141414", pillText: "#FFFFFF" },
  { bg: "#F2F4F7", bgEdge: "#DCE3EB", text: "#141414", accent: "#2563EB", pillFill: "#2563EB", pillText: "#FFFFFF" },
  { bg: "#F4F1FB", bgEdge: "#E7DEFB", text: "#141414", accent: "#7C3AED", pillFill: "#141414", pillText: "#FFFFFF" },
];

function resolvePalette(d?: CreativeDirection | null): Palette {
  if (!d) return FALLBACK_PALETTES[Math.floor(Math.random() * FALLBACK_PALETTES.length)];
  return {
    bg: d.palette.bg,
    bgEdge: d.palette.bgEdge,
    text: d.palette.text,
    accent: d.palette.accent,
    pillFill: d.palette.pillFill,
    pillText: d.palette.pillText,
  };
}

// ─── templates ────────────────────────────────────────────────────────────

const W = 1080;
const H = 1350;

type Template = (
  ctx: SKRSContext2D,
  img: Img,
  headline: string,
  cta: string,
  pal: Palette
) => void;

// 1) Editorial card — pastel bg, image in a soft rounded card, centered accent
//    tick above the headline, SOLID PILL cta. (premium / Notion)
const tEditorial: Template = (ctx, img, headline, cta, pal) => {
  paintBg(ctx, W, H, pal.bg, pal.bgEdge);
  const m = Math.round(W * 0.085);
  const imgH = Math.round(H * 0.5);
  const imageOnTop = Math.random() < 0.5;
  const imgY = imageOnTop ? m : H - m - imgH;
  drawImageCover(ctx, img, m, imgY, W - m * 2, imgH, Math.round(W * 0.045), true);

  const maxW = W - m * 2;
  const { size, lines, lineHeight } = fitHeadline(ctx, headline, Math.round(W * 0.085), Math.round(W * 0.05), maxW, 3);
  const ctaSize = Math.round(W * 0.04);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.045) : 0;
  const tickH = Math.round(W * 0.05);
  const blockH = tickH + lines.length * lineHeight + (cta ? ctaH + gap : 0);

  const textTop = imageOnTop
    ? imgY + imgH + Math.round(W * 0.06)
    : Math.max(Math.round(W * 0.09), Math.round((imgY - m - blockH) / 2));
  const cx = W / 2;
  // centered accent tick
  ctx.fillStyle = pal.accent;
  ctx.fillRect(cx - Math.round(W * 0.03), textTop, Math.round(W * 0.06), Math.max(3, Math.round(W * 0.007)));
  const headTop = textTop + tickH;
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, headTop, pal.text);
  if (cta) drawPill(ctx, cx, headTop + lines.length * lineHeight + gap, cta, ctaSize, pal.pillFill, pal.pillText);
};

// 2) Full-bleed — image fills frame, dark scrim, UPPERCASE headline, white
//    GHOST outline cta (no fill). (magazine cover / hero)
const tFullBleed: Template = (ctx, img, headline, cta, pal) => {
  drawImageCover(ctx, img, 0, 0, W, H, 0);
  const m = Math.round(W * 0.08);
  const maxW = W - m * 2;
  const head = headline.toUpperCase();
  const { size, lines, lineHeight } = fitHeadline(ctx, head, Math.round(W * 0.092), Math.round(W * 0.055), maxW, 3);
  const ctaSize = Math.round(W * 0.042);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.05) : 0;
  const blockH = lines.length * lineHeight + (cta ? ctaH + gap : 0);
  const blockTop = H - Math.round(W * 0.1) - blockH;
  const scrimTop = Math.max(0, blockTop - Math.round(H * 0.16));
  const g = ctx.createLinearGradient(0, scrimTop, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);
  const cx = W / 2;
  // brand-accent kicker bar above the headline
  const barW = Math.round(W * 0.14);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(cx - barW / 2, blockTop - Math.round(W * 0.045), barW, Math.max(4, Math.round(W * 0.008)));
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, blockTop, "#FFFFFF");
  if (cta) drawGhostButton(ctx, cx, blockTop + lines.length * lineHeight + gap, cta, ctaSize, "#FFFFFF");
};

// 3) Split — left text column, full-height SHARP-EDGE image right, a vertical
//    accent rule beside the headline, ARROW rectangle button. (Stripe SaaS)
const tSplit: Template = (ctx, img, headline, cta, pal) => {
  paintBg(ctx, W, H, pal.bg, pal.bgEdge);
  const m = Math.round(W * 0.07);
  const imgW = Math.round(W * 0.46);
  drawImageCover(ctx, img, W - imgW, 0, imgW, H, 0);
  const ruleW = Math.max(4, Math.round(W * 0.011));
  const ruleGap = Math.round(W * 0.04);
  const textX = m + ruleW + ruleGap;
  const colW = W - imgW - textX - Math.round(W * 0.04);
  const { size, lines, lineHeight } = fitHeadline(ctx, headline, Math.round(W * 0.07), Math.round(W * 0.044), colW, 6);
  const ctaSize = Math.round(W * 0.036);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.045) : 0;
  const blockH = lines.length * lineHeight + (cta ? ctaH + gap : 0);
  const top = Math.round((H - blockH) / 2);
  drawVRule(ctx, m, top, lines.length * lineHeight - Math.round(size * 0.2), ruleW, pal.accent);
  if (headline) drawHeadline(ctx, lines, size, lineHeight, textX, top, pal.text, "left");
  if (cta) drawRectButton(ctx, textX, top + lines.length * lineHeight + gap, cta, ctaSize, pal.pillFill, pal.pillText, "left", Math.round(W * 0.008), true);
};

// 4) Big poster — solid brand color, scattered dot texture, huge UPPERCASE
//    headline, CIRCULAR image accent, underlined text-LINK cta. (loud / gen-z)
// Product hero: one centered visual subject with a clean headline system.
// This replaces the old product-launch split panel that made every output
// look like the same grey-left / phone-right ad.
const tProductHero: Template = (ctx, img, headline, cta, pal) => {
  paintBg(ctx, W, H, pal.bg, pal.bgEdge);
  const m = Math.round(W * 0.075);
  const maxW = W - m * 2;
  const { size, lines, lineHeight } = fitHeadline(
    ctx,
    headline,
    Math.round(W * 0.078),
    Math.round(W * 0.048),
    maxW,
    3
  );
  const cx = W / 2;
  const top = Math.round(H * 0.095);

  ctx.fillStyle = pal.accent;
  roundedRectPath(
    ctx,
    cx - Math.round(W * 0.055),
    top - Math.round(W * 0.04),
    Math.round(W * 0.11),
    Math.max(5, Math.round(W * 0.009)),
    Math.round(W * 0.01)
  );
  ctx.fill();

  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, top, pal.text);

  const ctaSize = Math.round(W * 0.038);
  if (cta) {
    drawRectButton(
      ctx,
      cx,
      top + lines.length * lineHeight + Math.round(W * 0.045),
      cta,
      ctaSize,
      pal.pillFill,
      pal.pillText,
      "center",
      Math.round(W * 0.02),
      true
    );
  }

  const imageTop = Math.round(H * 0.52);
  const imageH = Math.round(H * 0.39);
  const imageW = Math.round(W * 0.78);
  drawImageCover(
    ctx,
    img,
    cx - imageW / 2,
    imageTop,
    imageW,
    imageH,
    Math.round(W * 0.045),
    true
  );
  strokeFrame(
    ctx,
    cx - imageW / 2,
    imageTop,
    imageW,
    imageH,
    Math.round(W * 0.045),
    "rgba(20,20,20,0.10)",
    2
  );
};

const tPoster: Template = (ctx, img, headline, cta, pal) => {
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 0, W, H);
  const fg = readableOn(pal.accent);
  const dotColor = fg === "#FFFFFF" ? "rgba(255,255,255,0.16)" : "rgba(20,20,20,0.12)";
  drawDots(ctx, Math.round(W * 0.08), Math.round(H * 0.06), 7, 3, Math.round(W * 0.06), Math.max(3, Math.round(W * 0.008)), dotColor);
  const m = Math.round(W * 0.085);
  const maxW = W - m * 2;
  const head = headline.toUpperCase();
  const { size, lines, lineHeight } = fitHeadline(ctx, head, Math.round(W * 0.12), Math.round(W * 0.07), maxW, 4);
  const cx = W / 2;
  const top = Math.round(H * 0.13);
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, top, fg);
  // circular image accent near the bottom
  const d = Math.round(W * 0.34);
  const iy = H - Math.round(W * 0.1) - d - (cta ? Math.round(W * 0.13) : 0);
  drawImageCover(ctx, img, cx - d / 2, iy, d, d, d / 2);
  if (cta) drawLinkCta(ctx, cx, iy + d + Math.round(W * 0.055), cta, Math.round(W * 0.046), fg, "center");
};

// 5) Top banner — colored band with headline at top, full-bleed image below.
const tBanner: Template = (ctx, img, headline, cta, pal) => {
  const bandH = Math.round(H * 0.4);
  drawImageCover(ctx, img, 0, bandH, W, H - bandH, 0);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 0, W, bandH);
  const fg = readableOn(pal.accent);
  const m = Math.round(W * 0.08);
  const maxW = W - m * 2;
  const { size, lines, lineHeight } = fitHeadline(ctx, headline, Math.round(W * 0.07), Math.round(W * 0.05), maxW, 3);
  const ctaSize = Math.round(W * 0.036);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.045) : 0;
  const ruleH = Math.round(W * 0.035);
  const blockH = lines.length * lineHeight + ruleH + (cta ? ctaH + gap : 0);
  const top = Math.max(Math.round(W * 0.06), Math.round((bandH - blockH) / 2));
  const cx = W / 2;
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, top, fg);
  // thin rule under the headline
  const ruleY = top + lines.length * lineHeight + Math.round(W * 0.012);
  ctx.fillStyle = fg;
  ctx.fillRect(cx - Math.round(W * 0.05), ruleY, Math.round(W * 0.1), Math.max(2, Math.round(W * 0.005)));
  // SHARP filled rectangle button (square corners)
  if (cta) drawRectButton(ctx, cx, ruleY + ruleH, cta, ctaSize, fg === "#FFFFFF" ? "#FFFFFF" : "#141414", fg === "#FFFFFF" ? pal.accent : "#FFFFFF", "center", 0);
};

// 6) Framed — brand-color frame around an inset image, headline in bottom band.
const tFrame: Template = (ctx, img, headline, cta, pal) => {
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 0, W, H);
  const fg = readableOn(pal.accent);
  const m = Math.round(W * 0.075);
  const imgY = m;
  const imgH = Math.round(H * 0.62);
  const imgR = Math.round(W * 0.02);
  drawImageCover(ctx, img, m, imgY, W - m * 2, imgH, imgR);
  // thin contrasting outline hugging the inset image
  const inset = Math.round(W * 0.018);
  strokeFrame(ctx, m + inset, imgY + inset, W - m * 2 - inset * 2, imgH - inset * 2, Math.max(0, imgR - inset), fg, Math.max(2, Math.round(W * 0.004)));
  const maxW = W - m * 2;
  const { size, lines, lineHeight } = fitHeadline(ctx, headline, Math.round(W * 0.072), Math.round(W * 0.05), maxW, 2);
  const ctaSize = Math.round(W * 0.038);
  const ctaH = ctaSize + Math.round(ctaSize * 0.55) * 2;
  const gap = cta ? Math.round(W * 0.035) : 0;
  const blockH = lines.length * lineHeight + (cta ? ctaH + gap : 0);
  const bandTop = imgY + imgH;
  const top = bandTop + Math.max(Math.round(W * 0.04), Math.round((H - bandTop - m - blockH) / 2));
  const cx = W / 2;
  if (headline) drawHeadline(ctx, lines, size, lineHeight, cx, top, fg);
  // soft-radius rectangle button (distinct from the full pill)
  if (cta) drawRectButton(ctx, cx, top + lines.length * lineHeight + gap, cta, ctaSize, fg === "#FFFFFF" ? "#FFFFFF" : "#141414", fg === "#FFFFFF" ? pal.accent : "#FFFFFF", "center", Math.round(W * 0.012));
};

export type TemplateName =
  | "productHero"
  | "editorial"
  | "fullbleed"
  | "split"
  | "poster"
  | "banner"
  | "frame";

const TEMPLATE_FNS: Record<TemplateName, Template> = {
  productHero: tProductHero,
  editorial: tEditorial,
  fullbleed: tFullBleed,
  split: tSplit,
  poster: tPoster,
  banner: tBanner,
  frame: tFrame,
};

// Documented creative metadata for each template (the "deck" of creative
// directions). Used for selection logic + future tooling.
export const TEMPLATE_META: Record<
  TemplateName,
  {
    style_category: string;
    best_for: string[];
    platforms: string[];
    typography: string;
    layout_style: string;
    color_style: string;
    emotional_tone: string;
    cta_style: string;
    visual_identity: string;
  }
> = {
  productHero: {
    style_category: "product-hero",
    best_for: ["product launches", "SaaS reveals", "startup announcements"],
    platforms: ["instagram", "linkedin", "twitter"],
    typography: "large clean headline with centered CTA",
    layout_style: "headline top, one rounded product visual below",
    color_style: "brand-tinted background + single accent",
    emotional_tone: "clear, premium, launch-ready",
    cta_style: "centered rounded rectangle with arrow",
    visual_identity: "premium product hero",
  },
  editorial: {
    style_category: "premium-minimal",
    best_for: ["founder updates", "thought leadership", "calm SaaS"],
    platforms: ["instagram", "linkedin", "twitter"],
    typography: "clean editorial sans, generous spacing",
    layout_style: "image in a rounded card + headline above/below",
    color_style: "soft pastel background + brand accent",
    emotional_tone: "calm, premium, trustworthy",
    cta_style: "solid pill",
    visual_identity: "Notion / Linear editorial",
  },
  fullbleed: {
    style_category: "bold-lifestyle",
    best_for: ["lifestyle", "fashion", "fitness", "gen-z launches"],
    platforms: ["instagram", "youtube", "facebook"],
    typography: "large bold headline over image",
    layout_style: "edge-to-edge image with bottom gradient scrim",
    color_style: "image-led + brand-accent CTA",
    emotional_tone: "immersive, confident, social-first",
    cta_style: "accent pill on scrim",
    visual_identity: "magazine cover / hero ad",
  },
  split: {
    style_category: "modern-saas",
    best_for: ["product launch", "fintech", "B2B SaaS", "professional"],
    platforms: ["linkedin", "twitter", "website"],
    typography: "bold left-aligned headline column",
    layout_style: "text column left, full-height image right",
    color_style: "light/tinted background + brand accent",
    emotional_tone: "professional, clear, credible",
    cta_style: "solid pill, left-aligned",
    visual_identity: "Stripe / clean SaaS",
  },
  poster: {
    style_category: "bold-startup",
    best_for: ["announcements", "high-energy", "gen-z", "campaigns"],
    platforms: ["instagram", "youtube"],
    typography: "huge dominant headline",
    layout_style: "solid brand-color field, headline-led, circular image accent",
    color_style: "solid brand color, high contrast",
    emotional_tone: "loud, energetic, attention-grabbing",
    cta_style: "contrast pill",
    visual_identity: "bold typographic poster",
  },
  banner: {
    style_category: "corporate-clean",
    best_for: ["product showcase", "corporate", "professional offers"],
    platforms: ["linkedin", "facebook", "instagram"],
    typography: "headline in a colored top band",
    layout_style: "brand-color band on top, full-bleed image below",
    color_style: "brand-color band + image",
    emotional_tone: "structured, dependable, clear",
    cta_style: "contrast pill on band",
    visual_identity: "clean corporate announcement",
  },
  frame: {
    style_category: "luxury-premium",
    best_for: ["luxury", "premium consumer", "editorial brands"],
    platforms: ["instagram", "website"],
    typography: "refined headline in lower band",
    layout_style: "brand-color frame around an inset image",
    color_style: "solid brand frame + contained image",
    emotional_tone: "refined, cinematic, high-end",
    cta_style: "contrast pill",
    visual_identity: "premium framed editorial",
  },
};

// Intelligent matching: each style favours a few templates; platform nudges it.
// We pick WITHIN the allowed set (with anti-repeat) — so the look is driven by
// the startup's style + platform, never a random global template.
const STYLE_TEMPLATES: Record<VisualStyle, TemplateName[]> = {
  modern_saas: ["split", "editorial", "banner"],
  stripe_saas: ["split", "banner", "editorial"],
  apple_minimal: ["frame", "editorial", "fullbleed"],
  luxury: ["frame", "fullbleed", "editorial"],
  premium: ["frame", "editorial", "fullbleed"],
  bold: ["poster", "fullbleed", "banner"],
  gen_z: ["poster", "fullbleed", "banner"],
  futuristic: ["poster", "split", "fullbleed"],
  dark_mode: ["fullbleed", "poster", "split"],
  corporate: ["banner", "split", "editorial"],
  editorial: ["editorial", "frame", "fullbleed"],
  aesthetic: ["editorial", "fullbleed", "frame"],
  minimal: ["editorial", "frame", "split"],
  startup_clean: ["editorial", "split", "banner"],
};

const ALL_TEMPLATES = Object.keys(TEMPLATE_FNS) as TemplateName[];
let _lastTemplate: TemplateName | null = null;

// Pool = the style's templates (always 3+ distinct looks). We ROTATE among
// them with anti-repeat, so the same startup never gets the same template
// twice in a row, while staying on-brand (palette + style stay consistent).
// (We deliberately do NOT intersect with a platform list — that could collapse
//  the pool to a single template and produce the "always the same design" bug.)
function selectTemplate(
  d?: CreativeDirection | null,
  force?: TemplateName | null
): TemplateName {
  if (force && TEMPLATE_FNS[force]) {
    _lastTemplate = force;
    return force;
  }
  const pool = d ? (STYLE_TEMPLATES[d.style] ?? ALL_TEMPLATES) : ALL_TEMPLATES;
  let choices = pool.filter((t) => t !== _lastTemplate);
  if (choices.length === 0) choices = pool;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  _lastTemplate = pick;
  return pick;
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function compositeText(
  baseImage: Buffer,
  text: OverlayText
): Promise<Buffer> {
  ensureFont();
  const img = await loadImage(baseImage);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const headline = (text.headline ?? "").trim();
  const cta = (text.cta ?? "").trim().toUpperCase();
  const pal = resolvePalette(text.direction);

  if (!headline && !cta) {
    paintBg(ctx, W, H, pal.bg, pal.bgEdge);
    const m = Math.round(W * 0.06);
    drawImageCover(ctx, img, m, m, W - m * 2, H - m * 2, Math.round(W * 0.04), true);
    return await canvas.encode("jpeg", 92);
  }

  const picked = selectTemplate(text.direction, text.forceTemplate ?? null);
  TEMPLATE_FNS[picked](ctx, img, headline, cta, pal);
  return await canvas.encode("jpeg", 92);
}
