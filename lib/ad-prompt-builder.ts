import { resolveBrandColor } from "./creative-direction";
import { PALETTES, type AdBrief, type AdCopy, type AdLever, type ColorCombo } from "./ad-brief";
import {
  pickStrategePalette,
  pickHeroTreatment,
  NO_FAKE_UI,
  BANNED_COLORS,
  SAFE_ZONE_RULE,
  compositionBlock,
} from "./prompt-constants";

// Builds the 6-part ad prompt that reliably produces clean, ready-to-post
// product ads with Ideogram 4.0 (native text rendering). Uniqueness comes from
// rotating a few "levers" (color pair, product side, render style, font, bg)
// off a deterministic seed, so "make another one" varies but a single ad is
// reproducible.

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
const BGS = [
  "clean gradient",
  "soft radial gradient",
  "smooth diagonal gradient",
];

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

const POSITION_BY_SIDE: Record<AdLever["side"], string> = {
  left: "the top left",
  right: "the top left",
  center: "the top center",
};

export function buildAdPrompt(opts: {
  product: string;
  description: string;
  copy: AdCopy;
  colors: [string, string];
  lever: AdLever;
  forRemix: boolean;
}): string {
  const { product, description, copy, colors, lever, forRemix } = opts;
  const [colorA, colorB] = colors;
  const headlinePos = POSITION_BY_SIDE[lever.side];

  // Subject clause differs: for remix the real product photo carries the
  // geometry, so we just say to keep it; for generate we describe it fully.
  const subject = forRemix
    ? `Keep the provided product object exactly as it is and place it on the ${lever.side}.`
    : `${description || product} placed on the ${lever.side}, ${lever.render}.`;

  const cta = copy.cta?.trim();
  const ctaLine = cta
    ? `A small rounded pill button at the bottom reading "${cta}". `
    : "";

  return `A bold, modern social media advertisement poster for ${product}.
${subject}
${lever.bg} background in ${colorA} and ${colorB}.
Large bold ${lever.font} headline at ${headlinePos} reading "${copy.headline}".
Smaller subheadline reading "${copy.subhead}".
${ctaLine}${SAFE_ZONE_RULE} Minimal, high-contrast, magazine-grade, crisp typography, social-media ready, ready to post.`;
}

// Convenience: build straight from a complete brief + resolved colors.
export function buildAdPromptFromBrief(
  brief: AdBrief,
  colors: [string, string],
  lever: AdLever,
  forRemix: boolean
): string {
  return buildAdPrompt({
    product: brief.productName ?? "the product",
    description: brief.productDescription ?? "",
    copy: brief.copy!,
    colors,
    lever,
    forRemix,
  });
}

// ─── Dual-input flow ────────────────────────────────────────────────────────
// A fully-resolved brief produced by the parser → merger pipeline. Lives here
// (rather than ad-brief-merger) so the prompt builder owns the prompt shape.
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

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Screenshot ad (SaaS) ───────────────────────────────────────────────────
// The real product screenshot is composited on top with Sharp AFTER generation,
// so Ideogram only makes the background + headline/subhead/CTA and must LEAVE
// the mockup side empty (and draw no fake UI of its own).
export function buildScreenshotAdPrompt(opts: {
  copy: AdCopy;
  colors: [string, string];
  font: string;
  bg: string;
  mockupSide: "left" | "right"; // where the screenshot will be placed
  visionDesc?: string;
}): string {
  const { copy, colors, font, bg, mockupSide, visionDesc } = opts;
  const [colorA, colorB] = colors;
  const textSide = mockupSide === "left" ? "right" : "left";

  const cta = copy.cta?.trim();
  const ctaLine = cta ? `A small rounded pill button reading "${cta}". ` : "";
  const category = visionDesc ? `It is a software product: ${visionDesc} ` : "";

  return `A bold, modern social-media advertisement poster for a software product. ${category}
Keep the entire ${mockupSide} half of the composition as clean, empty negative space — a product screenshot will be placed there separately. ${cap(NO_FAKE_UI)}.
${bg} background in ${colorA} and ${colorB}.
Large bold ${font} headline on the ${textSide} reading "${copy.headline}".
Smaller subheadline beneath it reading "${copy.subhead}".
${ctaLine}${SAFE_ZONE_RULE} Minimal, high-contrast, magazine-grade, crisp typography, generous negative space, social-media ready, ready to post.`;
}

// ─── Stratège full-canvas background (text drawn by Sharp) ───────────────────
// Text-free Stratège hero/background. The headline/subhead/CTA are composited
// afterward by lib/text-overlay.ts, so they're always inside the safe zone.
export function buildStrategeBackgroundPrompt(opts: {
  bg: string;
  accent: string;
  textSide: "left" | "right";
  seed: string;
}): string {
  const { bg, accent, textSide, seed } = opts;
  const heroSide = textSide === "left" ? "right" : "left";
  const hero = pickHeroTreatment(hash(seed) >> 5);
  return `A warm, editorial Stratège brand background for a social-media advertisement — founder-personal, magazine-grade. NO text of any kind.
${bg} background with subtle ${accent} accents. On the ${heroSide} side: ${hero}. Keep the ${textSide} side a calm, even ${bg} field with generous negative space for text to be added later.
Render NO text, NO letters, NO words, NO numbers, NO headline, NO captions, NO labels, NO logos, NO UI, and ${NO_FAKE_UI}.
Absolutely ${BANNED_COLORS}. Warm, editorial, generous negative space, crisp, high quality. Absolutely no text anywhere in the image.`;
}

// ─── Stratège self-marketing lock ───────────────────────────────────────────
// Builds a fully brand-locked prompt for Stratège's OWN ads. Enforces the
// visual locks: only the 3 approved palettes (Lock 1), one concrete hero scene
// instead of abstract graphics (Locks 2 + 6), negative-prompt against
// dashboards/charts/AI clichés, and strict composition/hierarchy (Lock 5).
// Color rotation is confined to the brand palettes — it can never drift into
// purple/indigo/neon. Voice locks (3 + 4) live in lib/ad-copy.ts.
export function buildStrategeAdPrompt(opts: {
  copy: AdCopy;
  seed: string;
  forRemix?: boolean;
  logoPresent?: boolean;
}): string {
  const { copy, seed, forRemix = false, logoPresent = true } = opts;
  const h = hash(seed);
  const pal = pickStrategePalette(h);
  const hero = forRemix
    ? "Keep the provided product/photo exactly as it is as the hero, placed with generous negative space"
    : pickHeroTreatment(h >> 5);

  const cta = copy.cta?.trim();
  const ctaLine = cta
    ? `A solid ${pal.accent}-filled pill CTA button with high-contrast text reading "${cta}". `
    : "";
  const logoLine = logoPresent
    ? "Place the small Stratège logo (two ascending chevrons) at the bottom-left, about 8% of the width. "
    : "";

  return `A warm, editorial social-media advertisement poster for Stratège — a content thinking partner for founders. Founder-personal and magazine-grade. This is NOT a generic SaaS ad.

Hero: ${hero}.

Color palette — use ONLY these three colors: ${pal.bg} background, ${pal.accent} accent, ${pal.text} text. Warm, editorial, high-contrast. Absolutely ${BANNED_COLORS}.

Large bold serif headline as the focal point reading "${copy.headline}".
Smaller subheadline reading "${copy.subhead}".
${ctaLine}${logoLine}

${cap(NO_FAKE_UI)}.

${compositionBlock()}

Editorial, warm, founder-personal, generous negative space, crisp typography, social-media ready, ready to post.`;
}

// ─── Split-layout background (text drawn by Sharp, not Ideogram) ─────────────
// Ideogram renders ONLY a clean, text-free background. The headline/subhead/CTA
// are composited afterward by lib/text-overlay.ts, so placement is guaranteed
// (no reliance on Ideogram obeying a safe-zone instruction).
export function buildSplitBackgroundPrompt(opts: {
  bg: string;
  accent: string;
  mockupSide: "left" | "right";
  brandLocked: boolean;
}): string {
  const { bg, accent, mockupSide, brandLocked } = opts;
  const textSide = mockupSide === "left" ? "right" : "left";
  const brandLine = brandLocked
    ? `Warm, editorial, founder-personal — Stratège brand. Absolutely ${BANNED_COLORS}.`
    : "";

  return `A clean, modern brand background for a social-media advertisement — NO text of any kind.
A single, even, flat ${bg} color field — no panels, cards, blocks, rounded rectangles, columns, stripes, or decorative shapes; at most a very subtle ${accent} grain. Calm, generous negative space, editorial and flat.
Keep the entire ${mockupSide} half completely empty and clean (a product screenshot will be placed there later). Keep the ${textSide} half a calm, even color field with room for text to be added later.
Render NO text, NO letters, NO words, NO numbers, NO headline, NO captions, NO labels, NO logos, NO UI, and ${NO_FAKE_UI}.
${brandLine}
Flat, clean, high quality, used purely as a backdrop. Absolutely no text anywhere in the image.`;
}

// ─── Stratège self-marketing + screenshot (the fifth template) ───────────────
// Combines the brand-locked palette (cream/green/noir) with the screenshot
// composition (one half left empty for the Sharp-overlaid framed screenshot).
// Used when isStrategeBrand AND a screenshot is attached, so brand locks are
// never dropped on the screenshot path.
export function buildStrategeScreenshotAdPrompt(opts: {
  copy: AdCopy;
  seed: string;
  mockupSide: "left" | "right";
}): string {
  const { copy, seed, mockupSide } = opts;
  const pal = pickStrategePalette(hash(seed));
  const textSide = mockupSide === "left" ? "right" : "left";

  const cta = copy.cta?.trim();
  const ctaLine = cta
    ? `A solid ${pal.accent}-filled rounded pill CTA button reading "${cta}". `
    : "";

  return `A warm, editorial social-media advertisement poster for Stratège — a content thinking partner for founders. Founder-personal and magazine-grade. This is NOT a generic SaaS ad.

Keep the entire ${mockupSide} half of the composition as clean, empty negative space — a product screenshot will be placed there separately. ${cap(NO_FAKE_UI)}.

Color palette — use ONLY these three colors: ${pal.bg} background, ${pal.accent} accent, ${pal.text} text. Warm, editorial, high-contrast. Absolutely ${BANNED_COLORS}.

Large bold serif headline on the ${textSide} reading "${copy.headline}".
Smaller subheadline beneath it reading "${copy.subhead}".
${ctaLine}

${compositionBlock()}

Editorial, warm, founder-personal, generous negative space, crisp typography, ready to post.`;
}

// Same 6-part formula, powered by the merged dual-input brief.
export function buildPromptFromMerged(opts: {
  product: string;
  description?: string; // product description (lookalike/text); "" for remix
  copy: AdCopy;
  merged: MergedBrief;
  forRemix: boolean;
}): string {
  const { product, description, copy, merged, forRemix } = opts;
  const [colorA, colorB] = merged.colors;
  const pos = merged.side === "center" ? "the top center" : "the top left";
  const lightingClause = merged.lighting ? `, ${merged.lighting}` : "";

  const subject = forRemix
    ? `Keep the provided product object exactly as it is and place it on the ${merged.side}.`
    : `${description || product} placed on the ${merged.side}, ${merged.render}${lightingClause}.`;

  const cta = copy.cta?.trim();
  const ctaLine = cta ? `A small rounded pill button at the bottom reading "${cta}". ` : "";
  const logoLine = merged.logo ? `Place the brand logo at the ${merged.logo.position}. ` : "";
  const notesLine = merged.extra_notes ? `${merged.extra_notes}. ` : "";
  const moodLine = merged.mood ? `${cap(merged.mood)} mood. ` : "";

  return `A bold, modern social media advertisement poster for ${product}.
${subject}
${merged.bg} background in ${colorA} and ${colorB}.
Large bold ${merged.font} headline at ${pos} reading "${copy.headline}".
Smaller subheadline reading "${copy.subhead}".
${ctaLine}${logoLine}${notesLine}${moodLine}${SAFE_ZONE_RULE} Minimal, high-contrast, magazine-grade, crisp typography, social-media ready, ready to post.`;
}
