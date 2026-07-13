import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { ARCHETYPE_CONFIGS, LOGO_WIDTH_MIN, LOGO_WIDTH_MAX, type ArchetypeConfig } from "./layout-archetypes";
import { stripChecks } from "./resolved-brief";

// Deterministic display-typography rendering. Ideogram makes only the text-free
// background; here Sharp/canvas draws the headline + subhead + checklist + CTA +
// logo, placed by an ARCHETYPE CONFIG (lib/layout-archetypes.ts). No opaque panel
// — contrast is guaranteed by a feathered gradient SCRIM applied only when the
// sampled background under the text zone fails WCAG 4.5:1. When no archetype is
// passed we fall back to HERO_LEFT, reproducing the pre-Phase-2 split so the
// screenshot path never regresses.

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
  logo?: Buffer; // brand logo — drawn small in the archetype's slot, never by Ideogram
  archetype?: ArchetypeConfig; // resolved config; defaults to HERO_LEFT (back-compat)
  benefits?: string[]; // checklist items (TEXT_HEAVY / HERO_TYPE)
  price?: string;
  discount?: string;
}

type Ctx = import("@napi-rs/canvas").SKRSContext2D;

const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";

// ── color helpers ────────────────────────────────────────────────────────────
function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length < 6) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// WCAG relative luminance from 0..255 channels.
function relLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
function isLight(hex: string): boolean {
  const [r, g, b] = rgbOf(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Average relative luminance of a background region. Reads one getImageData for
// the zone and averages a strided subsample. HARD FALLBACK: any failure returns
// null so the caller forces the scrim (readability must never depend on this).
function zoneLuminance(ctx: Ctx, x: number, y: number, w: number, h: number, W: number, H: number): number | null {
  try {
    const zx = Math.max(0, Math.floor(x));
    const zy = Math.max(0, Math.floor(y));
    const zw = Math.max(1, Math.min(Math.floor(w), W - zx));
    const zh = Math.max(1, Math.min(Math.floor(h), H - zy));
    const data = ctx.getImageData(zx, zy, zw, zh).data;
    const stride = Math.max(1, Math.floor((zw * zh) / 1600)); // ~1600 samples max
    let sum = 0;
    let n = 0;
    for (let i = 0; i < zw * zh; i += stride) {
      const p = i * 4;
      sum += relLuminance(data[p], data[p + 1], data[p + 2]);
      n++;
    }
    return n ? sum / n : null;
  } catch {
    return null;
  }
}

// A feathered radial scrim — never a hard-edged card. Darkens (or lightens) the
// text zone just enough for the copy to read.
function drawScrim(ctx: Ctx, cx: number, cy: number, radius: number, dark: boolean, maxDarkness: number): void {
  const c = dark ? "0,0,0" : "255,255,255";
  const g = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  g.addColorStop(0, `rgba(${c},${maxDarkness})`);
  g.addColorStop(0.6, `rgba(${c},${maxDarkness * 0.7})`);
  g.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

// ── text helpers ─────────────────────────────────────────────────────────────
function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}
function applyCase(s: string, c: ArchetypeConfig["headline"]["case"]): string {
  if (c === "upper") return s.toUpperCase();
  if (c === "title") return titleCase(s);
  return s;
}

function wrap(ctx: Ctx, text: string, font: string, maxW: number): string[] {
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
}
function widest(ctx: Ctx, lines: string[], font: string): number {
  ctx.font = font;
  return lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
}

// Size the headline. "fill" grows UP to the cap so the longest line fills the
// column (the HERO_TYPE display look); "fixed" uses the cap but shrinks to fit.
function sizeHeadline(
  ctx: Ctx,
  text: string,
  cfg: ArchetypeConfig["headline"],
  colW: number,
  refDim: number
): { size: number; lines: string[] } {
  const cap = Math.round(cfg.scaleFrac * refDim);
  const font = (px: number) => `${cfg.weight} ${px}px ${SERIF}`;
  const floor = Math.round(refDim * 0.03);
  for (let px = cap; px >= floor; px -= 2) {
    const lines = wrap(ctx, text, font(px), colW);
    if (lines.length <= cfg.maxLines && widest(ctx, lines, font(px)) <= colW) {
      return { size: px, lines };
    }
  }
  return { size: floor, lines: wrap(ctx, text, font(floor), colW).slice(0, cfg.maxLines) };
}

// Draw a small check icon at (x, midY), sized to `s`. Icon-only — the strings
// carry no checkmark characters.
function drawCheck(ctx: Ctx, x: number, midY: number, s: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + s * 0.15, midY);
  ctx.lineTo(x + s * 0.42, midY + s * 0.28);
  ctx.lineTo(x + s * 0.85, midY - s * 0.3);
  ctx.stroke();
}

export async function drawSplitAdText(image: Buffer, opts: SplitTextOptions): Promise<Buffer> {
  ensureFont();
  const img = await loadImage(image);
  const W = img.width;
  const H = img.height;
  const refDim = Math.min(W, H);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  const cfg = opts.archetype ?? ARCHETYPE_CONFIGS.HERO_LEFT;
  const safeX = Math.round(W * 0.05);
  const safeY = Math.round(H * 0.05);
  const textColor = opts.palette.text || (isLight(opts.palette.bg) ? "#171713" : "#FFFFFF");
  const accent = opts.palette.accent;
  const ctaTextColor = isLight(accent) ? "#171713" : "#FFFFFF";

  // ── text column geometry (mirror to the right half for side-aware archetypes)
  const colW = Math.round(cfg.block.widthFrac * W);
  const baseX = Math.round(cfg.block.xFrac * W);
  const onRight = cfg.block.sideAware && opts.textSide === "right";
  const colX = onRight ? Math.max(safeX, W - baseX - colW) : baseX;
  const align: "left" | "center" | "right" = cfg.block.hAlign;
  // x at which text is drawn given the alignment.
  const textX = align === "center" ? colX + colW / 2 : align === "right" ? colX + colW : colX;

  ctx.textBaseline = "top";

  // ── size everything ──────────────────────────────────────────────────────
  const head = applyCase(opts.headline, cfg.headline.case);
  const { size: hSize, lines: hLines } = sizeHeadline(ctx, head, cfg.headline, colW, refDim);
  const hFont = `${cfg.headline.weight} ${hSize}px ${SERIF}`;
  const hLineH = Math.round(hSize * cfg.headline.lineHeight);

  const sSize = cfg.subhead ? Math.round(cfg.subhead.scaleFrac * refDim) : 0;
  const sFont = `400 ${sSize}px ${SERIF}`;
  const sLines = cfg.subhead && opts.subhead ? wrap(ctx, opts.subhead, sFont, colW).slice(0, cfg.subhead.maxLines) : [];
  const sLineH = Math.round(sSize * (cfg.subhead?.lineHeight ?? 1.3));

  const benefits = (opts.benefits ?? []).map((b) => stripChecks(b)).filter(Boolean);
  const clSize = cfg.checklist
    ? Math.max(Math.round(cfg.checklist.scaleFrac * refDim), Math.round(28 * (refDim / 1080)))
    : 0;
  const clItems = cfg.checklist ? benefits.slice(0, cfg.checklist.maxItems) : [];
  const clLineH = Math.round(clSize * 1.7);

  const priceStr = cfg.price ? [opts.price, opts.discount].filter(Boolean).join("  ") : "";
  const pSize = cfg.price ? Math.round(cfg.price.scaleFrac * refDim) : 0;
  const pLineH = Math.round(pSize * 1.3);

  const cta = opts.cta?.trim();
  const ctaSize = Math.round(cfg.cta.scaleFrac * refDim);
  const ctaH = Math.round(ctaSize * 2.4);
  const ctaFlow = cfg.cta.place === "flow";

  const gapHS = Math.round(refDim * 0.028);
  const gapMinor = Math.round(refDim * 0.022);

  const blockH =
    hLines.length * hLineH +
    (sLines.length ? gapHS + sLines.length * sLineH : 0) +
    (clItems.length ? gapMinor + clItems.length * clLineH : 0) +
    (priceStr ? gapMinor + pLineH : 0) +
    (cta && ctaFlow ? gapHS + ctaH : 0);

  // Vertical anchor from the config, clamped inside the safe zone.
  const availTop = safeY;
  const availBot = H - safeY;
  let top: number;
  if (cfg.block.vAlign === "top") top = Math.round(cfg.block.yFrac * H);
  else if (cfg.block.vAlign === "bottom") top = Math.round(cfg.block.yFrac * H - blockH);
  else top = Math.round(cfg.block.yFrac * H - blockH / 2);
  top = Math.max(availTop, Math.min(top, availBot - blockH));

  // ── SCRIM: sample the bg under the block; gate on WCAG 4.5:1 ───────────────
  if (cfg.scrim.enabled) {
    const zx = align === "center" ? colX : Math.min(colX, textX) - safeX * 0.4;
    const bgLum = zoneLuminance(ctx, zx, top, colW, blockH, W, H);
    const [tr, tg, tb] = rgbOf(textColor);
    const textLum = relLuminance(tr, tg, tb);
    const needScrim = bgLum === null || contrastRatio(textLum, bgLum) < 4.5;
    if (needScrim) {
      const dark = textLum > 0.4; // light text → darken behind it
      const cx = align === "center" ? colX + colW / 2 : colX + colW * 0.45;
      const cy = top + blockH / 2;
      const radius = Math.max(colW, blockH) * 0.72 + refDim * 0.06;
      drawScrim(ctx, cx, cy, radius, dark, cfg.scrim.maxDarkness);
    }
  }

  // ── draw headline ──────────────────────────────────────────────────────────
  ctx.fillStyle = textColor;
  ctx.font = hFont;
  ctx.textAlign = align;
  for (const ln of hLines) {
    ctx.fillText(ln, textX, top);
    top += hLineH;
  }

  // subhead
  if (sLines.length) {
    top += gapHS;
    ctx.font = sFont;
    ctx.fillStyle = textColor;
    for (const ln of sLines) {
      ctx.fillText(ln, textX, top);
      top += sLineH;
    }
  }

  // checklist (icon-only checks; strings carry none)
  if (clItems.length) {
    top += gapMinor;
    ctx.font = `500 ${clSize}px ${SERIF}`;
    ctx.textAlign = "left";
    const startX = align === "center" ? colX + colW / 2 - colW * 0.4 : colX;
    for (const item of clItems) {
      drawCheck(ctx, startX, top + clSize * 0.5, clSize, accent);
      ctx.fillStyle = textColor;
      ctx.fillText(item, startX + clSize * 1.25, top + clSize * 0.12);
      top += clLineH;
    }
    ctx.textAlign = align;
  }

  // price / discount
  if (priceStr) {
    top += gapMinor;
    ctx.font = `700 ${pSize}px ${SERIF}`;
    ctx.fillStyle = textColor;
    ctx.fillText(priceStr, textX, top);
    top += pLineH;
  }

  // ── CTA pill ────────────────────────────────────────────────────────────────
  if (cta) {
    ctx.font = `600 ${ctaSize}px ${SERIF}`;
    const padX = Math.round(ctaSize * 1.2);
    const textW = ctx.measureText(cta).width;
    const pillW = Math.min(colW, Math.round(textW + padX * 2));
    let pillX: number;
    let pillY: number;
    if (ctaFlow) {
      top += gapHS;
      pillY = top;
      pillX = align === "center" ? colX + (colW - pillW) / 2 : align === "right" ? colX + colW - pillW : colX;
    } else {
      pillY = H - safeY - ctaH;
      if (cfg.cta.place === "bottomCenter") pillX = Math.round((W - pillW) / 2);
      else if (cfg.cta.place === "bottomRight") pillX = W - safeX - Math.round(W * 0.04) - pillW;
      else pillX = safeX + Math.round(W * 0.04);
    }
    roundRect(ctx, pillX, pillY, pillW, ctaH, Math.round(ctaH / 2));
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = ctaTextColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(cta, pillX + padX, pillY + Math.round(ctaH / 2) + 1);
    ctx.textBaseline = "top";
  }

  // ── logo slot (Part A: original variant only; contrast handling is Part B) ──
  if (opts.logo) {
    try {
      const logoImg = await loadImage(opts.logo);
      const widthFrac = Math.min(LOGO_WIDTH_MAX, Math.max(LOGO_WIDTH_MIN, cfg.logoSlot.widthFrac));
      const logoW = Math.round(W * widthFrac);
      const logoH = Math.round((logoImg.height / logoImg.width) * logoW);
      const m = safeX + Math.round(W * 0.04); // safe zone + 4% corner exclusion
      const corner = cfg.logoSlot.corner;
      const lx =
        corner === "bc"
          ? Math.round((W - logoW) / 2)
          : corner === "tr" || corner === "br"
          ? W - m - logoW
          : m;
      const ly = corner === "tl" || corner === "tr" ? m : H - m - logoH;
      ctx.drawImage(logoImg, lx, ly, logoW, logoH);
    } catch {
      /* logo drawing is best-effort */
    }
  }

  return canvas.toBuffer("image/jpeg", 92);
}
