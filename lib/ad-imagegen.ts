import sharp from "sharp";
import { generateImages, remixImage } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import {
  buildAdPromptFromBrief,
  buildPromptFromMerged,
  buildStrategeAdPrompt,
  buildSplitBackgroundPrompt,
  buildStrategeBackgroundPrompt,
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

// Ad Studio generation pipeline (native-text ads).
//   exact     → Ideogram v4 remix (keeps the real uploaded product)
//   lookalike → Ideogram v4 generate from a vision description
//   text      → Ideogram v4 generate from the typed product name
// Ideogram renders ALL text; there is no code overlay step here.

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
  // Stratège self-marketing → brand-locked prompt (palettes, hero, negatives).
  const stratege = isStrategeBrand(brand);

  // Full-canvas Stratège ad → text-free background + deterministic Sharp text
  // overlay (edge-safe). Remix (real product photo) keeps the Ideogram path.
  if (stratege && !isExact) {
    const r = await renderStrategeFullCanvas(brand, brief.copy, seed, lever.side);
    return {
      url: r.url,
      copy: brief.copy,
      mode: brief.mode ?? "text",
      color: brief.color,
      lever,
      fallback: r.fallback,
      debug: {
        prompt: r.prompt,
        levers: { stratege: true, deterministicText: true, palette: r.paletteName, side: lever.side },
      },
    };
  }

  const prompt = stratege
    ? buildStrategeAdPrompt({ copy: brief.copy, seed, forRemix: isExact })
    : buildAdPromptFromBrief({ ...brief, lever }, colors, lever, isExact);

  logPromptConsole(prompt);

  let result;
  if (isExact) {
    const buf = await loadImageBuffer(brief.photoUrl!);
    result = await remixImage({
      prompt,
      imageBuffer: buf,
      imageWeight: REMIX_IMAGE_WEIGHT,
      aspectRatio: "ASPECT_1_1",
    });
  } else {
    result = await generateImages({ prompt, count: 1, aspectRatio: "ASPECT_1_1" });
  }

  // Re-host on our own storage so the URL is stable + editable later.
  const buf = await loadImageBuffer(result.urls[0]);
  const url = await storeImage(buf, "jpg");
  await logPromptFile(prompt, url);

  return {
    url,
    copy: brief.copy,
    mode: brief.mode ?? "text",
    color: brief.color,
    lever,
    fallback: result.fallback,
    debug: {
      prompt,
      levers: {
        stratege,
        color: brief.color,
        colors: stratege ? "brand-locked" : colors,
        side: lever.side,
        render: lever.render,
        font: lever.font,
        background: lever.bg,
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

  // Full-canvas Stratège ad → text-free background + deterministic Sharp text.
  if (stratege && !isExact) {
    const r = await renderStrategeFullCanvas(brand, copy, seed, merged.side);
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
        mergedFields: merged,
        levers: { stratege: true, deterministicText: true, palette: r.paletteName, side: merged.side },
      },
    };
  }

  const prompt = stratege
    ? buildStrategeAdPrompt({
        copy,
        seed,
        forRemix: isExact,
        logoPresent: !!merged.logo,
      })
    : buildPromptFromMerged({
        product,
        description: opts.productDescription ?? "",
        copy,
        merged,
        forRemix: isExact,
      });

  logPromptConsole(prompt);

  let result;
  if (isExact) {
    const buf = await loadImageBuffer(opts.photoUrl!);
    result = await remixImage({
      prompt,
      imageBuffer: buf,
      imageWeight: REMIX_IMAGE_WEIGHT,
      aspectRatio: "ASPECT_1_1",
    });
  } else {
    result = await generateImages({ prompt, count: 1, aspectRatio: "ASPECT_1_1" });
  }

  const buf = await loadImageBuffer(result.urls[0]);
  const url = await storeImage(buf, "jpg");
  await logPromptFile(prompt, url);

  return {
    url,
    copy,
    mode: opts.mode ?? "text",
    color: "brand",
    lever: pickLever(seed),
    fallback: result.fallback,
    debug: {
      prompt,
      parsedFields: parsed,
      mergedFields: stratege ? { ...merged, colors: "brand-locked" } : merged,
      levers: {
        stratege,
        colors: stratege ? "brand-locked" : merged.colors,
        side: merged.side,
        render: merged.render,
        font: merged.font,
        background: merged.bg,
        lighting: merged.lighting,
        mood: merged.mood,
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

  // Stratège self-marketing → FLAT Sharp brand-color field, no Ideogram at all
  //   (zero stray marks, zero API cost, instant). User brands → text-free
  //   Ideogram background in their own colors.
  let bg: Buffer;
  let fallback = false;
  let prompt: string;
  if (stratege) {
    prompt = "(flat Sharp brand-color background — no Ideogram)";
    bg = await sharp({
      create: { width: AD_SIZE, height: AD_SIZE, channels: 3, background: hexToRgb(palette.bg) },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
  } else {
    prompt = buildSplitBackgroundPrompt({
      bg: palette.bg,
      accent: palette.accent,
      mockupSide,
      brandLocked: false,
    });
    logPromptConsole(prompt);
    const result = await generateImages({ prompt, count: 1, aspectRatio: "ASPECT_1_1" });
    fallback = result.fallback;
    bg = await sharp(await loadImageBuffer(result.urls[0]))
      .resize(AD_SIZE, AD_SIZE, { fit: "cover" })
      .toBuffer();
  }

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

// Full-canvas Stratège self-marketing ad: text-free Stratège hero background
// (Ideogram) + Sharp-drawn copy in the brand serif, inside the 5% safe zone.
async function renderStrategeFullCanvas(
  brand: Record<string, unknown>,
  copy: AdCopy,
  seed: string,
  side: AdLever["side"]
): Promise<{ url: string; fallback: boolean; prompt: string; paletteName: string }> {
  void brand;
  const palette = pickStrategePalette(seedHash(seed));
  const textSide: "left" | "right" = side === "left" ? "left" : "right";
  const prompt = buildStrategeBackgroundPrompt({
    bg: palette.bg,
    accent: palette.accent,
    textSide,
    seed,
  });
  logPromptConsole(prompt);
  const result = await generateImages({ prompt, count: 1, aspectRatio: "ASPECT_1_1" });
  const bg = await sharp(await loadImageBuffer(result.urls[0]))
    .resize(AD_SIZE, AD_SIZE, { fit: "cover" })
    .toBuffer();
  const final = await drawSplitAdText(bg, {
    textSide,
    headline: copy.headline,
    subhead: copy.subhead,
    cta: copy.cta,
    palette: { bg: palette.bg, accent: palette.accent, text: palette.text },
  });
  const url = await storeImage(final, "jpg");
  await logPromptFile(prompt, url);
  return { url, fallback: result.fallback, prompt, paletteName: palette.name };
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
