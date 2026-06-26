// ─────────────────────────────────────────────────────────────────────────────
// SHARED PROMPT CONSTANTS — single source of truth for every image template.
//
// All five templates in lib/ad-prompt-builder.ts import these. Change a rule
// here once and it applies everywhere — no more per-template drift (which caused
// off-brand palettes + text-cut-off bugs). This module imports nothing (leaf),
// so it's safe to import from anywhere.
// ─────────────────────────────────────────────────────────────────────────────

// Keep every headline / subhead / CTA away from the canvas edges.
export const SAFE_ZONE_RULE =
  "All text must stay within a safe zone of at least 5% padding from every edge of the canvas. No text touches or crosses the canvas edges. Keep all headlines, subheadlines, and CTA buttons fully inside the visible frame.";

// Things that must never appear (full "DO NOT include:" sentence).
export const NEGATIVE_VISUAL_ELEMENTS =
  "DO NOT include: fake dashboards, chart mockups, bar graphs or line graphs, pie charts, generic UI fragments, abstract data visualizations, floating cards with fake numbers, analytics interfaces, robot or AI imagery, brain illustrations, lightbulb 'idea' icons, speed lines, lightning bolts, or rockets.";

// Off-brand colors that drift the look toward generic SaaS (incl. the navy that
// broke the diagnosed ad).
export const BANNED_COLOR_TERMS =
  "Absolutely no purple, violet, indigo, neon colors, bright blue gradients, navy corporate tones, rainbow gradients, or SaaS purple-to-pink gradients.";

// Core hierarchy rules (wrapped as "Composition rules — strict: …" by templates).
export const COMPOSITION_RULES =
  "ONE dominant focal point; ONE supporting element; negative space at least 40% of the frame; CTA solid-filled, high-contrast; every element must relate to the message.";

// Headline length per layout.
export const HEADLINE_LENGTH_FULL = "2-5 words";
export const HEADLINE_LENGTH_SPLIT =
  "2-3 words, single line, no word longer than 10 characters";

// The composition block templates drop in (core rules + safe zone, always together).
export function compositionBlock(): string {
  return `Composition rules — strict: ${COMPOSITION_RULES} ${SAFE_ZONE_RULE}`;
}

// ─── Brand-locked palettes (Stratège self-marketing) ─────────────────────────
export interface StrategePalette {
  name: string;
  bg: string;
  accent: string;
  text: string;
  weight: number; // rotation weight (must sum to 100)
}

export const STRATEGE_PALETTES: StrategePalette[] = [
  { name: "cream", bg: "#F5F1EA", accent: "#1D9E75", text: "#1A1A1A", weight: 60 },
  { name: "green", bg: "#1D9E75", accent: "#F5F1EA", text: "#FFFFFF", weight: 25 },
  { name: "noir", bg: "#0A0C0F", accent: "#5DCAA5", text: "#F0F0F0", weight: 15 },
];

// Weighted pick from a stable hash (0..n). 60% cream / 25% green / 15% noir.
export function pickStrategePalette(h: number): StrategePalette {
  const pct = h % 100;
  let acc = 0;
  for (const p of STRATEGE_PALETTES) {
    acc += p.weight;
    if (pct < acc) return p;
  }
  return STRATEGE_PALETTES[0];
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
