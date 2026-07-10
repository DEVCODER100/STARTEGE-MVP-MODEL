import sharp from "sharp";
import { generateImages, remixImage } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import {
  buildBackgroundPrompt,
  pickLever,
  resolveCombo,
} from "./ad-prompt-builder";
import { parseDescription } from "./ad-brief-parser";
import { mergeWithDefaults } from "./ad-brief-merger";
import { writeAdCopy, describeScreenshot } from "./ad-copy";
import { isStrategeBrand } from "./brand-locks";
import { pickStrategePalette } from "./prompt-constants";
import { compositeScreenshotInFrame, type FrameType } from "./device-frames";
import { drawSplitAdText } from "./text-overlay";
import { logPromptConsole, logPromptFile } from "./prompt-log";
import type { AdBrief, AdCopy, AdLever, AdMode, ColorCombo } from "./ad-brief";

// Ad generation pipeline. Ideogram renders ONLY a text-free background (a hero
// scene / the product / a flat brand field); ALL ad text is drawn afterward by
// Sharp (lib/text-overlay.ts), so spelling is always correct and text always
// lands inside the safe zone. One text engine for every brand.
//   exact     → Ideogram v4 remix (keeps the real uploaded product), text-free
//   lookalike → Ideogram v4 generate the product, text-free
//   text      → Ideogram v4 generate from the typed product name, text-free

const REMIX_IMAGE_WEIGHT = 68; // 60-75: keep product recognisable, allow new bg+text

// Debug payload so we can see the exact prompt + decisions behind any image.
export interface AdDebug {
  prompt: string;
  parsedFields?: unknown;
  mergedFields?: unknown;
  levers: Record<string, unknown>;
}

export interface GeneratedAd {
  url: string;
  copy: AdCopy;
  mode: AdMode | "text";
  color: ColorCombo;
  lever: AdLever;
  fallback: boolean;
  debug: AdDebug;
}

export async function generateAd(
  brand: Record<string, unknown>,
  brief: AdBrief,
  seed: string
): Promise<GeneratedAd> {
  if (!brief.copy) throw new Error("generateAd: brief.copy required");
  if (!brief.color) throw new Error("generateAd: brief.color required");

  const lever = brief.lever ?? pickLever(seed);
  const colors = resolveCombo(brief.color, brand);
  const isExact =
    brief.productSource === "upload" && brief.mode === "exact" && !!brief.photoUrl;
  const stratege = isStrategeBrand(brand);
  const palette = stratege
    ? pickStrategePalette(seedHash(seed))
    : { bg: colors[0], accent: colors[1], text: "" };

  // Hero product ONLY when explicitly provided: exact photo → remix; lookalike
  // photo → its vision description; text → the product the user named. Never the
  // stored brand.product (that's a category → would hallucinate a hero).
  const heroSubject = isExact
    ? undefined
    : brief.productDescription?.trim() || brief.productName?.trim() || undefined;

  const r = await renderFullCanvasAd({
    copy: brief.copy,
    seed,
    side: lever.side,
    brandLocked: stratege,
    palette,
    product: heroSubject,
    render: lever.render,
    photoUrl: isExact ? brief.photoUrl : undefined,
  });

  return {
    url: r.url,
    copy: brief.copy,
    mode: brief.mode ?? "text",
    color: brief.color,
    lever,
    fallback: r.fallback,
    debug: {
      prompt: r.prompt,
      levers: {
        stratege,
        deterministicText: true,
        colors: stratege ? "brand-locked" : colors,
        side: lever.side,
        render: lever.render,
      },
    },
  };
}

// ─── Dual-input "Describe" flow ─────────────────────────────────────────────
// The Image Studio textarea is the source of truth: parse it → fill nulls with
// smart defaults from the brand → auto-write copy → build the prompt → render.
export interface DescribeOptions {
  description: string; // final textarea content (palettes/styles/chips + free text)
  photoUrl?: string; // optional uploaded product photo
  mode?: AdMode; // exact | lookalike (only meaningful with a photo)
  productDescription?: string; // optional vision description for lookalike
}

export async function generateFromDescription(
  brand: Record<string, unknown>,
  opts: DescribeOptions,
  seed: string
): Promise<GeneratedAd> {
  const parsed = await parseDescription(opts.description);
  const merged = mergeWithDefaults(parsed, brand, seed);

  const product = String(brand.product ?? "the product").slice(0, 120);
  const written = await writeAdCopy({ product, description: opts.description, brand });
  const copy: AdCopy = {
    headline: merged.headline_text || written.headline,
    subhead: written.subhead,
    cta: written.cta,
  };

  const isExact = !!opts.photoUrl && opts.mode === "exact";
  const stratege = isStrategeBrand(brand);
  const palette = stratege
    ? pickStrategePalette(seedHash(seed))
    : { bg: merged.colors[0], accent: merged.colors[1], text: "" };

  // Hero product ONLY when explicitly provided: exact photo → remix; lookalike
  // photo → its vision description; else the product the user NAMED in the
  // description (parsed.product). Never the stored brand.product category.
  const heroSubject = isExact
    ? undefined
    : opts.productDescription?.trim() || parsed.product?.trim() || undefined;

  const r = await renderFullCanvasAd({
    copy,
    seed,
    side: merged.side,
    brandLocked: stratege,
    palette,
    product: heroSubject,
    render: merged.render,
    photoUrl: isExact ? opts.photoUrl : undefined,
  });

  return {
    url: r.url,
    copy,
    mode: opts.mode ?? "text",
    color: "brand",
    lever: pickLever(seed),
    fallback: r.fallback,
    debug: {
      prompt: r.prompt,
      parsedFields: parsed,
      mergedFields: stratege ? { ...merged, colors: "brand-locked" } : merged,
      levers: {
        stratege,
        deterministicText: true,
        colors: stratege ? "brand-locked" : merged.colors,
        side: merged.side,
        render: merged.render,
      },
    },
  };
}

// ─── Screenshot / SaaS ad (Problem 2) ───────────────────────────────────────
// The real screenshot stays pixel-perfect: Ideogram makes only the background +
// text (mockup side left empty), then we composite the framed screenshot on top
// with Sharp.
const AD_SIZE = 1080;

export interface ScreenshotAdOptions {
  description: string;
  screenshotUrl: string;
  frameType: FrameType;
}

export async function generateScreenshotAd(
  brand: Record<string, unknown>,
  opts: ScreenshotAdOptions,
  seed: string
): Promise<GeneratedAd> {
  // 1) Frame the screenshot.
  const shotBuf = await loadImageBuffer(opts.screenshotUrl);
  const framed = await compositeScreenshotInFrame(shotBuf, opts.frameType);

  // 2) Vision describe (downscaled) so copy matches the product.
  let visionDesc = "";
  try {
    const small = await sharp(shotBuf).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    visionDesc = await describeScreenshot(`data:image/jpeg;base64,${small.toString("base64")}`);
  } catch {
    /* vision optional */
  }

  // 3) Colors/side/bg/font from the description + brand (reuse the studio engine).
  const parsed = await parseDescription(opts.description);
  const merged = mergeWithDefaults(parsed, brand, seed);
  const mockupSide: "left" | "right" = merged.side === "left" ? "left" : "right";

  // 4) Copy (Stratège voice / SaaS voice, with the 2-3 word split cap).
  const product = String(brand.product ?? "your product").slice(0, 120);
  const copy = await writeAdCopy({ product, description: visionDesc, brand, screenshot: true });

  // 5) DETERMINISTIC SPLIT LAYOUT. Ideogram makes ONLY a text-free background;
  //    the framed screenshot and the text are composited by us afterward, so
  //    placement is guaranteed (no reliance on Ideogram obeying instructions).
  const stratege = isStrategeBrand(brand);
  const textSide: "left" | "right" = mockupSide === "left" ? "right" : "left";
  const palette = stratege
    ? pickStrategePalette(seedHash(seed))
    : { bg: merged.colors[0], accent: merged.colors[1], text: "" };

  // FLAT Sharp brand-color field for ALL screenshot ads — exact palette, no
  // Ideogram (zero stray marks / color drift, zero API cost, instant). Then
  // composite the framed screenshot + Sharp text on top.
  const prompt = "(flat Sharp brand-color background — no Ideogram)";
  const fallback = false;
  const bg = await sharp({
    create: { width: AD_SIZE, height: AD_SIZE, channels: 3, background: hexToRgb(palette.bg) },
  })
    .jpeg({ quality: 95 })
    .toBuffer();

  // The mockup must stay within its own half (never cross the centre line),
  // so the text half stays clean for the Sharp-rendered copy.
  const isPortrait = framed.height > framed.width;
  const half = AD_SIZE / 2;
  const boxW = (isPortrait ? 0.36 : 0.42) * AD_SIZE;
  const boxH = (isPortrait ? 0.74 : 0.6) * AD_SIZE;
  const scale = Math.min(boxW / framed.width, boxH / framed.height);
  const drawW = Math.round(framed.width * scale);
  const drawH = Math.round(framed.height * scale);
  const resizedFramed = await sharp(framed.buffer).resize(drawW, drawH).toBuffer();
  // Centre the mockup within its half.
  const left =
    mockupSide === "left"
      ? Math.round((half - drawW) / 2)
      : Math.round(half + (half - drawW) / 2);
  const top = Math.round((AD_SIZE - drawH) / 2);
  const composited = await sharp(bg)
    .composite([{ input: resizedFramed, left, top }])
    .jpeg({ quality: 95 })
    .toBuffer();

  // 6b) Draw headline + subhead + CTA on the text side, inside a 5% safe zone,
  //     in the brand serif — guaranteed placement.
  const finalBuf = await drawSplitAdText(composited, {
    textSide,
    headline: copy.headline,
    subhead: copy.subhead,
    cta: copy.cta,
    palette: { bg: palette.bg, accent: palette.accent, text: palette.text },
  });
  const url = await storeImage(finalBuf, "jpg");
  await logPromptFile(prompt, url);

  return {
    url,
    copy,
    mode: "text",
    color: "brand",
    lever: pickLever(seed),
    fallback,
    debug: {
      prompt,
      parsedFields: { visionDesc, frameType: opts.frameType, mockupSide, textSide },
      mergedFields: merged,
      levers: { palette, mockupSide, textSide, frameType: opts.frameType },
    },
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

// Full-canvas ad (any brand): Ideogram renders a TEXT-FREE background — a hero
// scene (Stratège), the product (user), or a remix of the real product photo —
// then Sharp draws the copy inside the 5% safe zone. One path for all brands.
async function renderFullCanvasAd(opts: {
  copy: AdCopy;
  seed: string;
  side: AdLever["side"];
  brandLocked: boolean;
  palette: { bg: string; accent: string; text: string };
  product?: string;
  render?: string;
  photoUrl?: string; // present → remix (keep the real product)
}): Promise<{ url: string; fallback: boolean; prompt: string }> {
  const { copy, seed, side, brandLocked, palette, product, render, photoUrl } = opts;
  const textSide: "left" | "right" = side === "left" ? "left" : "right";
  const forRemix = !!photoUrl;

  const prompt = buildBackgroundPrompt({
    bg: palette.bg,
    accent: palette.accent,
    textSide,
    seed,
    brandLocked,
    product,
    render,
    forRemix,
  });
  logPromptConsole(prompt);

  let result;
  if (forRemix) {
    const buf = await loadImageBuffer(photoUrl!);
    result = await remixImage({
      prompt,
      imageBuffer: buf,
      imageWeight: REMIX_IMAGE_WEIGHT,
      aspectRatio: "ASPECT_1_1",
    });
  } else {
    result = await generateImages({ prompt, count: 1, aspectRatio: "ASPECT_1_1" });
  }

  const bg = await sharp(await loadImageBuffer(result.urls[0]))
    .resize(AD_SIZE, AD_SIZE, { fit: "cover" })
    .toBuffer();
  const final = await drawSplitAdText(bg, {
    textSide,
    headline: copy.headline,
    subhead: copy.subhead,
    cta: copy.cta,
    palette,
  });
  const url = await storeImage(final, "jpg");
  await logPromptFile(prompt, url);
  return { url, fallback: result.fallback, prompt };
}

// FNV-1a hash for palette rotation (mirrors ad-prompt-builder).
function seedHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Stored per generated message so an edit can regenerate without re-asking.
export interface AdImageMeta {
  v: 2;
  productName?: string;
  productDescription?: string;
  photoUrl?: string;
  mode: AdMode | "text";
  color: ColorCombo;
  copy: AdCopy;
  lever: AdLever;
}

// Regenerate an existing ad with patched copy (and/or color), reusing the same
// product, mode, and lever so the design stays consistent.
export async function editAd(
  brand: Record<string, unknown>,
  meta: AdImageMeta,
  patchedCopy: AdCopy,
  color?: ColorCombo
): Promise<GeneratedAd> {
  const brief: AdBrief = {
    v: 2,
    request: "",
    productSource: meta.photoUrl ? "upload" : "text",
    productName: meta.productName,
    productDescription: meta.productDescription,
    photoUrl: meta.photoUrl,
    mode: meta.mode === "text" ? undefined : meta.mode,
    color: color ?? meta.color,
    copy: patchedCopy,
    lever: meta.lever,
  };
  return generateAd(brand, brief, JSON.stringify(meta.lever));
}
