import { planImage } from "./imageplan";
import { generateImages } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import { compositeText } from "./overlay";
import {
  makeCreativeDirection,
  paletteFromAccent,
  resolveBrandColor,
  isDarkStyle,
  detectPlatform,
  type CreativeDirection,
} from "./creative-direction";
import {
  TEMPLATE_DEFAULT_CTA,
  type ImageBrief,
} from "./image-brief";
import { buildIdeogramPrompt } from "./image-prompt-builder";

// Full image pipeline:
//   1. Claude plans a startup-aware, text-free visual scene + overlay text.
//   2. Ideogram generates a clean visual subject with no text.
//   3. Canvas composites a controlled marketing-card layout.
//   4. Store both base image (for re-editing) and final output.

export interface GeneratedImage {
  url: string;
  baseUrl: string;
  headline: string;
  cta: string;
  direction: CreativeDirection;
  fallback: boolean;
}

export async function generateMarketingImage(
  brand: Record<string, unknown>,
  request: string,
  forced?: { headline?: string; cta?: string }
): Promise<GeneratedImage> {
  const plan = await planImage(brand, request);

  // User's choice is final: forced text bypasses the AI entirely.
  const headline =
    forced?.headline && forced.headline.trim()
      ? forced.headline.trim()
      : plan.headline;
  const cta =
    forced?.cta && forced.cta.trim() ? forced.cta.trim() : plan.cta;

  const ideoPrompt = `${plan.scene_prompt}

STARTUP CONTEXT:
Product: ${String(brand.product ?? "the product")}
Audience: ${String(brand.target_audience ?? "the target audience")}
Industry: ${String(brand.industry ?? "startup / SaaS")}
Positioning: ${String(brand.usp ?? brand.goal ?? "clear value")}

CREATIVE DIRECTION:
Style: ${plan.direction.style}
Platform: ${plan.direction.platform}
Energy: ${plan.direction.energy}
Image treatment: ${plan.direction.imageTreatment}
Subject direction: ${plan.direction.subjectHint}

COMPOSITION: a single square subject image. Make the visual identity specific to the product category and audience above. Do NOT reuse a generic founder/person-at-laptop scene unless it truly fits the product. Prefer product UI, device mockups, product object, lifestyle use-case, abstract 3D system, or editorial scene depending on the creative direction.

ABSOLUTELY NO TEXT IN THE IMAGE: zero words, zero letters, zero numbers, no signs, no labels, no captions, no watermark. Purely visual.

STYLE: follow the creative direction exactly. Real photography or clean 3D, never cluttered.
QUALITY: ultra high quality.`;

  const imgs = await generateImages({
    prompt: ideoPrompt,
    count: 1,
    aspectRatio: "ASPECT_1_1",
  });

  const baseBuf = await loadImageBuffer(imgs.urls[0]);
  const baseUrl = await storeImage(baseBuf, "jpg");

  const finalBuf = await compositeText(baseBuf, {
    headline,
    cta,
    direction: plan.direction,
  });
  const url = await storeImage(finalBuf, "jpg");

  return { url, baseUrl, headline, cta, direction: plan.direction, fallback: imgs.fallback };
}

/**
 * Brief-driven image generation: the user has answered the 3 creative
 * questions, so we go straight to a structured Ideogram prompt + a forced
 * overlay template (no random pick). This is the new primary code path.
 */
export async function generateMarketingImageFromBrief(
  brand: Record<string, unknown>,
  brief: ImageBrief
): Promise<GeneratedImage> {
  if (!brief.template) throw new Error("brief.template required");
  if (!brief.hook) throw new Error("brief.hook required");

  // Build creative direction. Color mode controls how brand colors are used:
  //   brand              → palette built straight from the brand color.
  //   brand_plus_accent  → same (overlay already does brand+accent rhythm).
  //   custom             → fall back to brand+accent for now.
  const platform = detectPlatform(brief.request, brand);
  let direction: CreativeDirection = makeCreativeDirection(brand, brief.request, {
    platform,
  });

  // If the brand has no real color captured, fall back to the existing
  // style palette but still try to be brand-aware via Claude (planImage).
  // For brief mode we keep it deterministic and skip the extra Claude call —
  // the layout + template choice already drives visual diversity.
  const brandAccent = resolveBrandColor(String(brand.brand_colors ?? ""));
  if (brandAccent) {
    direction = {
      ...direction,
      palette: paletteFromAccent(brandAccent, isDarkStyle(direction.style)),
    };
  }

  const ideoPrompt = buildIdeogramPrompt(brief, brand, direction);

  const imgs = await generateImages({
    prompt: ideoPrompt,
    count: 1,
    aspectRatio: "ASPECT_1_1",
  });

  const baseBuf = await loadImageBuffer(imgs.urls[0]);
  const baseUrl = await storeImage(baseBuf, "jpg");

  const headline = brief.hook.trim();
  const cta = (TEMPLATE_DEFAULT_CTA[brief.template] ?? "").trim();

  // TEMP TEST: text overlay (step 6) disabled — return the RAW Ideogram image
  // with no code-rendered headline/CTA. Re-enable compositeText() to restore.
  const url = baseUrl;

  return {
    url,
    baseUrl,
    headline,
    cta,
    direction,
    fallback: imgs.fallback,
  };
}

/** Re-render the text overlay on an existing base image (instant edit). */
export async function reoverlayImage(
  baseUrl: string,
  headline: string,
  cta: string,
  direction?: CreativeDirection | null
): Promise<string> {
  const baseBuf = await loadImageBuffer(baseUrl);
  const finalBuf = await compositeText(baseBuf, { headline, cta, direction });
  return storeImage(finalBuf, "jpg");
}
