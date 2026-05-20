import { planImage } from "./imageplan";
import { generateImages } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import { compositeText } from "./overlay";

// Full image pipeline:
//   1. Claude plans a TEXT-FREE scene + the overlay text (separately).
//   2. Ideogram generates a clean, text-free image.
//   3. Sharp composites perfect SVG text on top.
//   4. Store both the base (for re-editing) and the final image.

export interface GeneratedImage {
  url: string; // final composited image (perfect text)
  baseUrl: string; // text-free base (used to re-overlay edited text)
  headline: string;
  cta: string;
  fallback: boolean; // true if Ideogram fell back to a placeholder
}

export async function generateMarketingImage(
  brand: Record<string, unknown>,
  request: string,
  // When the user explicitly chose a headline/CTA, it is used VERBATIM —
  // the AI never rewrites it.
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

  // We composite this image INTO a designed marketing card (Notion/Stripe
  // style) — so we want a square subject crop with a clean composition that
  // works as a self-contained visual element, not a full-bleed background.
  const ideoPrompt = `${plan.scene_prompt}

COMPOSITION: a single square subject image with a clean, well-lit, well-composed scene. The subject is centered and clearly the focal point. The surroundings should feel premium and uncluttered (soft backgrounds, natural light, intentional negative space). Think editorial product / lifestyle photography.

ABSOLUTELY NO TEXT IN THE IMAGE: zero words, zero letters, zero numbers, no signs, no labels, no captions, no watermark. Purely visual.

STYLE: modern, premium, editorial — Notion, Stripe, Linear aesthetic. Real photography or clean 3D, never cluttered.
QUALITY: ultra high quality.`;

  const imgs = await generateImages({
    prompt: ideoPrompt,
    count: 1,
    aspectRatio: "ASPECT_1_1",
  });

  // Fetch the Ideogram image, store our own copy of the base (Ideogram URLs
  // expire), then overlay text.
  const baseBuf = await loadImageBuffer(imgs.urls[0]);
  const baseUrl = await storeImage(baseBuf, "jpg");

  const finalBuf = await compositeText(baseBuf, { headline, cta });
  const url = await storeImage(finalBuf, "jpg");

  return { url, baseUrl, headline, cta, fallback: imgs.fallback };
}

/** Re-render the text overlay on an existing base image (instant edit). */
export async function reoverlayImage(
  baseUrl: string,
  headline: string,
  cta: string
): Promise<string> {
  const baseBuf = await loadImageBuffer(baseUrl);
  const finalBuf = await compositeText(baseBuf, { headline, cta });
  return storeImage(finalBuf, "jpg");
}
