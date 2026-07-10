import { resolveBrandColor } from "./creative-direction";
import { PALETTES, type AdLever, type ColorCombo } from "./ad-brief";
import { pickHeroTreatment, NO_FAKE_UI, BANNED_COLORS } from "./prompt-constants";

// Prompt building for the image engine. Ideogram renders ONLY text-free
// backgrounds; ALL ad text is drawn deterministically by Sharp
// (lib/text-overlay.ts). Uniqueness comes from rotating "levers" (product side,
// render style, font, bg) off a deterministic seed. Every shared prompt RULE
// lives in lib/prompt-constants.ts — never redefine one here.

const SIDES: AdLever["side"][] = ["left", "right", "center"];
const RENDERS = [
  "3D octane render, dramatic studio lighting",
  "high-end studio product photography, soft cinematic lighting",
  "editorial product photo, crisp detail",
];
const FONTS = [
  "bold geometric sans-serif",
  "modern grotesk sans-serif",
  "bold condensed sans-serif",
];
const BGS = ["clean gradient", "soft radial gradient", "smooth diagonal gradient"];

// Small, dependency-free string hash → stable integer for lever rotation.
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function pickLever(seed: string): AdLever {
  const h = hash(seed);
  return {
    side: SIDES[h % SIDES.length],
    render: RENDERS[(h >> 3) % RENDERS.length],
    font: FONTS[(h >> 6) % FONTS.length],
    bg: BGS[(h >> 9) % BGS.length],
  };
}

function darken(hex: string, t: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const d = (n: number) =>
    Math.max(0, Math.round(n * (1 - t)))
      .toString(16)
      .padStart(2, "0");
  return `#${d(r)}${d(g)}${d(b)}`.toUpperCase();
}

// Resolve the chosen combo to a concrete [colorA, colorB] pair. "brand" derives
// the pair from the captured brand color (falls back to a safe combo).
export function resolveCombo(
  combo: ColorCombo,
  brand: Record<string, unknown>
): [string, string] {
  if (combo === "brand") {
    const accent = resolveBrandColor(String(brand.brand_colors ?? ""));
    if (accent) return [darken(accent, 0.55), accent];
    return [PALETTES.indigo_violet.colorA, PALETTES.indigo_violet.colorB];
  }
  return [PALETTES[combo].colorA, PALETTES[combo].colorB];
}

// A fully-resolved brief produced by the parser → merger pipeline.
export interface MergedBrief {
  colors: [string, string];
  side: AdLever["side"];
  render: string;
  bg: string;
  font: string;
  lighting: string | null;
  mood: string | null;
  logo: { position: string } | null;
  headline_text: string | null;
  extra_notes: string | null;
}

// ─── Full-canvas background (text drawn by Sharp) ────────────────────────────
// Ideogram renders a TEXT-FREE background only. One builder for every brand:
//  • brandLocked (Stratège) → an editorial hero scene, brand-locked palette.
//  • otherwise (user/product) → the product rendered on the hero side.
//  • forRemix → keep the user's real uploaded product photo.
// The headline/subhead/CTA are drawn afterward by lib/text-overlay.ts, so
// placement is guaranteed and spelling is always correct.
export function buildBackgroundPrompt(opts: {
  bg: string;
  accent: string;
  textSide: "left" | "right";
  seed: string;
  brandLocked: boolean;
  product?: string;
  render?: string;
  forRemix?: boolean;
}): string {
  const { bg, accent, textSide, seed, brandLocked, product, render, forRemix } = opts;
  const heroSide = textSide === "left" ? "right" : "left";
  const hasProduct = !!(product && product.trim());

  // Only render a product when one was EXPLICITLY provided (image / named).
  // Otherwise → an abstract on-brand composition, never an invented product.
  let sceneLine: string;
  if (forRemix) {
    sceneLine = `On the ${heroSide} side: keep the provided product object exactly as it is, with generous negative space.`;
  } else if (brandLocked) {
    sceneLine = `On the ${heroSide} side: ${pickHeroTreatment(hash(seed) >> 5)}.`;
  } else if (hasProduct) {
    sceneLine = `On the ${heroSide} side: ${product!.trim()} shown large and photorealistic${render ? `, ${render}` : ""}.`;
  } else {
    sceneLine = `A calm, abstract, on-brand composition — soft ${accent} gradient light, gentle geometric shapes and subtle texture, premium and editorial. Do NOT include any product, object, device, person, figure, logo, or mockup.`;
  }

  const brandLine = brandLocked
    ? `Warm, editorial, founder-personal — Stratège brand. Absolutely ${BANNED_COLORS}.`
    : "Bold, premium, high-contrast.";

  return `A clean brand background for a social-media advertisement — NO text of any kind.
${bg} background with subtle ${accent} accents. ${sceneLine} Keep the ${textSide} side a calm, even ${bg} field with generous negative space for text to be added later.
Render NO text, NO letters, NO words, NO numbers, NO headline, NO captions, NO labels, NO logos, NO UI, and ${NO_FAKE_UI}.
${brandLine} Generous negative space, crisp, high quality. Absolutely no text anywhere in the image.`;
}

