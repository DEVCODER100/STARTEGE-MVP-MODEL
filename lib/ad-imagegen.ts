import { generateImages, remixImage } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import { buildAdPromptFromBrief, pickLever, resolveCombo } from "./ad-prompt-builder";
import type { AdBrief, AdCopy, AdLever, AdMode, ColorCombo } from "./ad-brief";

// Ad Studio generation pipeline (native-text ads).
//   exact     → Ideogram v4 remix (keeps the real uploaded product)
//   lookalike → Ideogram v4 generate from a vision description
//   text      → Ideogram v4 generate from the typed product name
// Ideogram renders ALL text; there is no code overlay step here.

const REMIX_IMAGE_WEIGHT = 68; // 60-75: keep product recognisable, allow new bg+text

export interface GeneratedAd {
  url: string;
  copy: AdCopy;
  mode: AdMode | "text";
  color: ColorCombo;
  lever: AdLever;
  fallback: boolean;
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

  let result;
  if (isExact) {
    const prompt = buildAdPromptFromBrief({ ...brief, lever }, colors, lever, true);
    const buf = await loadImageBuffer(brief.photoUrl!);
    result = await remixImage({
      prompt,
      imageBuffer: buf,
      imageWeight: REMIX_IMAGE_WEIGHT,
      aspectRatio: "ASPECT_1_1",
    });
  } else {
    const prompt = buildAdPromptFromBrief({ ...brief, lever }, colors, lever, false);
    result = await generateImages({ prompt, count: 1, aspectRatio: "ASPECT_1_1" });
  }

  // Re-host on our own storage so the URL is stable + editable later.
  const buf = await loadImageBuffer(result.urls[0]);
  const url = await storeImage(buf, "jpg");

  return {
    url,
    copy: brief.copy,
    mode: brief.mode ?? "text",
    color: brief.color,
    lever,
    fallback: result.fallback,
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
