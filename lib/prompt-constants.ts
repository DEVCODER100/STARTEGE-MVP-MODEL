// ─────────────────────────────────────────────────────────────────────────────
// SHARED PROMPT CONSTANTS — single source of truth for ALL image prompts.
//
// Every prompt-building function imports from here. No function keeps its own
// hardcoded copy of these rules — change a rule once and it applies everywhere.
// This module imports nothing (leaf), so it's safe to import from anywhere.
// ─────────────────────────────────────────────────────────────────────────────

// Keep every headline / subhead / CTA away from the canvas edges.
export const SAFE_ZONE_RULE =
  "All text stays within 5% padding from every canvas edge. No text touches or crosses edges.";

// Off-brand colors that drift the look toward generic SaaS (incl. the navy that
// broke the diagnosed ad). Applied only where brand-locking is appropriate.
export const BANNED_COLORS =
  "no purple, violet, indigo, neon, bright blue, navy corporate, rainbow, SaaS purple-to-pink";

// Things the model must never draw itself (esp. on screenshot ads, where the
// real screenshot is composited in afterward).
export const NO_FAKE_UI =
  "no dashboards, charts, graphs, floating UI cards, robot/AI imagery, device mockups drawn by the model";

// The no-product rule (single source of truth). Used ONLY when no product image
// was uploaded and no product was named — the engine must NEVER invent a hero
// product (never infer one from the brand name).
export const NO_PRODUCTS =
  "Do NOT depict any product, device, gadget, object, item, person, hand, figure, logo, or mockup — an abstract background only. Never infer a product from the brand name.";

// Named-product rule: render exactly what was asked for, nothing else.
export function renderOnly(name: string): string {
  return `Render only: ${name}. No additional products or objects.`;
}

// ─── Cinematic abstract vocabulary (mood → background style) ─────────────────
// The no-product fix must ban OBJECTS, not visual richness. These map the
// brief's mood to a cinematic background treatment. Light, gradient, texture
// and depth are always allowed; products/objects/text/fake-UI never are.
export const MOOD_BACKGROUNDS: Record<string, string> = {
  energetic:
    "a saturated two-tone gradient sweeping across the frame, dramatic light rays and a soft burst glow, high contrast, kinetic depth",
  premium:
    "a deep dark field with a single dramatic spotlight falling from above, smooth falloff, subtle vignette, quiet luxurious depth",
  minimal:
    "a soft single-hue gradient with generous negative space, faint film grain, calm and airy, barely-there depth",
  warm:
    "warm cream and earth tones with a soft window-light glow, gentle organic texture, cozy cinematic atmosphere",
  bold:
    "a hard diagonal color split, strong geometric light shapes and a crisp cast shadow, punchy contrast, editorial drama",
};

// Rich default when no mood was chosen — cinematic, never flat.
export const DEFAULT_BACKGROUND_STYLE =
  "a smooth cinematic two-tone gradient with a gentle spotlight glow, subtle texture and atmospheric depth";

export function moodBackground(mood?: string | null): string {
  return (mood && MOOD_BACKGROUNDS[mood]) || DEFAULT_BACKGROUND_STYLE;
}

// Headline length per layout.
export const HEADLINE_SPLIT = "2-3 words, single line, no word over 10 chars";
export const HEADLINE_FULL = "2-5 words";

// Core hierarchy rules (wrapped as "Composition rules — strict: …" by templates).
export const COMPOSITION_RULES =
  "ONE dominant focal point; ONE supporting element; negative space at least 40% of the frame; CTA solid-filled, high-contrast; every element must relate to the message.";

// The composition block templates drop in (core rules + safe zone, always together).
export function compositionBlock(): string {
  return `Composition rules — strict: ${COMPOSITION_RULES} ${SAFE_ZONE_RULE}`;
}

// ─── Brand-locked palettes (Stratège self-marketing) ─────────────────────────
export interface BrandPalette {
  name: string;
  bg: string;
  accent: string;
  text: string;
  weight: number; // rotation weight (must sum to 100)
}

export const BRAND_PALETTES: BrandPalette[] = [
  { name: "cream", bg: "#F5F1EA", accent: "#1D9E75", text: "#1A1A1A", weight: 60 },
  { name: "green", bg: "#1D9E75", accent: "#F5F1EA", text: "#FFFFFF", weight: 25 },
  { name: "noir", bg: "#0A0C0F", accent: "#5DCAA5", text: "#F0F0F0", weight: 15 },
];

// Backwards-compatible alias (older imports used STRATEGE_PALETTES).
export const STRATEGE_PALETTES = BRAND_PALETTES;
export type StrategePalette = BrandPalette;

// Weighted pick from a stable hash (0..n). 60% cream / 25% green / 15% noir.
export function pickStrategePalette(h: number): BrandPalette {
  const pct = h % 100;
  let acc = 0;
  for (const p of BRAND_PALETTES) {
    acc += p.weight;
    if (pct < acc) return p;
  }
  return BRAND_PALETTES[0];
}

// Approved hero scenes — each one concrete, never an abstract concept.
export const HERO_TREATMENTS = [
  "A warm desk scene: an open laptop, a notebook, and a cup of coffee in soft natural daylight",
  "A typographic poster where the bold serif headline IS the hero — no graphics, generous negative space",
  "An editorial photograph of a founder at work, a candid story-first moment, magazine-style framing",
  "A recognizable fragment of the Stratège chat interface shown in context on a laptop screen",
  "A physical, hand-made element — a sticky note, a journal page, or a pinned-up index card, warm and tactile, not digital",
  "A founder at their desk just after shipping: laptop open, coffee nearby, the Stratège interface visible on screen",
  "A social post draft on screen going from blank to filled — a clear before/after moment",
  "A hand-written sticky note pinned to a desk with a post idea scribbled on it",
  "A close-up of a founder's hands typing on a keyboard — tactile, intimate, real",
  "A printed-out social post that Stratège generated, pinned to a corkboard — physical and real",
];

export function pickHeroTreatment(h: number): string {
  return HERO_TREATMENTS[h % HERO_TREATMENTS.length];
}
