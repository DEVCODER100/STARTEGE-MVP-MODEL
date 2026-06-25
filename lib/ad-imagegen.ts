import { generateImages, remixImage } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import {
  buildAdPromptFromBrief,
  buildPromptFromMerged,
  buildStrategeAdPrompt,
  pickLever,
  resolveCombo,
} from "./ad-prompt-builder";
import { parseDescription } from "./ad-brief-parser";
import { mergeWithDefaults } from "./ad-brief-merger";
import { writeAdCopy } from "./ad-copy";
import { isStrategeBrand } from "./brand-locks";
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
