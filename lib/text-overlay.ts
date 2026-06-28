import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";

// Deterministic text rendering for split-layout ads. Ideogram makes only the
// (text-free) background; here we draw the headline + subhead + CTA with the
// brand serif onto the text half, guaranteed inside a 5% safe zone. No reliance
// on Ideogram obeying placement instructions.

let fontReady = false;
function ensureFont(): void {
  if (fontReady) return;
  try {
    GlobalFonts.registerFromPath(path.join(process.cwd(), "fonts", "Fraunces.ttf"), "Fraunces");
  } catch {
    /* fall back to a generic serif if the file isn't found */
  }
  fontReady = true;
}

export interface SplitTextPalette {
  bg: string;
  accent: string;
  text: string;
}

export interface SplitTextOptions {
  textSide: "left" | "right";
  headline: string;
  subhead: string;
  cta?: string;
  palette: SplitTextPalette;
}

// True if the hex color is light (→ use dark text on it).
function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}

function roundRect(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawSplitAdText(image: Buffer, opts: SplitTextOptions): Promise<Buffer> {
  ensureFont();
  const img = await loadImage(image);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
  const safe = Math.round(W * 0.05); // 5% safe zone
  // Text column: the chosen half, inset by the safe zone on the outer edge and
  // a small gutter on the inner (center) edge.
  const gutter = Math.round(W * 0.05);
  const colW = W / 2 - safe - gutter;
  const colX = opts.textSide === "left" ? safe : Math.round(W / 2 + gutter);

  const textColor = opts.palette.text || (isLight(opts.palette.bg) ? "#171713" : "#FFFFFF");
  const accent = opts.palette.accent;
  const ctaTextColor = isLight(accent) ? "#171713" : "#FFFFFF";

  const hSize = Math.round(W * 0.064);
  const sSize = Math.round(W * 0.025);
  const ctaSize = Math.round(W * 0.023);

  ctx.textBaseline = "top";

  const wrap = (text: string, font: string, maxW: number): string[] => {
    ctx.font = font;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = t;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const hFont = `600 ${hSize}px ${SERIF}`;
  const sFont = `400 ${sSize}px ${SERIF}`;
  const hLines = wrap(opts.headline, hFont, colW);
  const sLines = wrap(opts.subhead, sFont, colW);

  const hLineH = Math.round(hSize * 1.06);
  const sLineH = Math.round(sSize * 1.4);
  const gapHS = Math.round(W * 0.028);
  const gapSC = Math.round(W * 0.032);
  const cta = opts.cta?.trim();
  const ctaH = Math.round(ctaSize * 2.4);

  const blockH =
    hLines.length * hLineH +
    gapHS +
    sLines.length * sLineH +
    (cta ? gapSC + ctaH : 0);

  let top = Math.max(safe, Math.round((H - blockH) / 2));

  // Guarantee contrast: a clean brand-color panel behind the text block, so the
  // copy is always readable no matter what Ideogram drew on the background.
  const blockTop = top;
  const panelPad = Math.round(W * 0.05);
  const panelX = Math.max(0, (opts.textSide === "left" ? safe : colX) - panelPad);
  const panelW = Math.min(W - panelX, colW + panelPad * 2);
  roundRect(ctx, panelX, blockTop - panelPad, panelW, blockH + panelPad * 2, Math.round(W * 0.02));
  ctx.fillStyle = opts.palette.bg;
  ctx.fill();

  // Headline
  ctx.fillStyle = textColor;
  ctx.font = hFont;
  for (const ln of hLines) {
    ctx.fillText(ln, colX, top);
    top += hLineH;
  }
  top += gapHS;

  // Subhead
  ctx.font = sFont;
  ctx.fillStyle = textColor;
  for (const ln of sLines) {
    ctx.fillText(ln, colX, top);
    top += sLineH;
  }

  // CTA pill
  if (cta) {
    top += gapSC;
    ctx.font = `600 ${ctaSize}px ${SERIF}`;
    const padX = Math.round(ctaSize * 1.2);
    const textW = ctx.measureText(cta).width;
    const pillW = Math.min(colW, Math.round(textW + padX * 2));
    roundRect(ctx, colX, top, pillW, ctaH, Math.round(ctaH / 2));
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = ctaTextColor;
    ctx.textBaseline = "middle";
    ctx.fillText(cta, colX + padX, top + Math.round(ctaH / 2) + 1);
    ctx.textBaseline = "top";
  }

  return canvas.toBuffer("image/jpeg", 92);
}
