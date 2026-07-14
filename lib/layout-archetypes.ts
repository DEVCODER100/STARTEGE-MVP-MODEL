// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT ARCHETYPES — the single source of truth for display-typography geometry.
//
// Each archetype is a pure config object that lib/text-overlay.ts reads to place
// the headline / subhead / checklist / CTA / logo. Routes NEVER hardcode layout;
// they only pass a chosen archetype id. Ideogram still draws no text or logos —
// Sharp owns every glyph. Imports only leaves (resolved-brief, prompt-constants),
// so there is no cycle.
// ─────────────────────────────────────────────────────────────────────────────

import { fnv1a } from "./prompt-constants";
import {
  ARCHETYPES,
  ARCHETYPE_LABELS,
  type Archetype,
  type Mood,
} from "./resolved-brief";

export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "center" | "bottom";
export type Corner = "tl" | "tr" | "bl" | "br" | "bc";

// The text column: where copy sits and how wide it is (fractions of canvas W/H).
export interface TextBlock {
  xFrac: number; // left edge of the column (the LEFT-side placement)
  widthFrac: number; // column width
  yFrac: number; // anchor y
  vAlign: VAlign; // how the stacked block sits around yFrac
  hAlign: HAlign; // text alignment within the column
  sideAware: boolean; // mirror x to the hero's opposite half when textSide="right"
}

export interface HeadlineCfg {
  case: "upper" | "title" | "sentence";
  fit: "fill" | "fixed"; // "fill" sizes UP to fill widthFrac (the HERO_TYPE look)
  scaleFrac: number; // font px = scaleFrac * refDim ("fill" treats it as the cap)
  lineHeight: number; // multiple of font px
  maxLines: number;
  weight: number;
}

export interface CtaCfg {
  scaleFrac: number;
  place: "flow" | "bottomCenter" | "bottomLeft" | "bottomRight";
}

export interface ArchetypeConfig {
  id: Archetype;
  name: string;
  block: TextBlock;
  headline: HeadlineCfg;
  subhead: { scaleFrac: number; lineHeight: number; maxLines: number } | null;
  checklist: { scaleFrac: number; maxItems: number; inlineMax: number } | null;
  price: { scaleFrac: number } | null;
  cta: CtaCfg;
  logoSlot: { corner: Corner; widthFrac: number };
  scrim: { enabled: boolean; maxDarkness: number };
  compatibleMoods: Mood[];
  // Part D fills these; empty for now → resolveArchetypeConfig returns the base.
  aspectOverrides?: Partial<Record<string, DeepPartial<ArchetypeConfig>>>;
}

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

// Logo width clamp shared by every archetype (fraction of canvas width).
export const LOGO_WIDTH_MIN = 0.06;
export const LOGO_WIDTH_MAX = 0.1;

const ALL_MOODS: Mood[] = ["energetic", "premium", "minimal", "warm", "bold"];

export const ARCHETYPE_CONFIGS: Record<Archetype, ArchetypeConfig> = {
  // The old "UNLEASH YOUR EDGE" look — massive uppercase display headline.
  HERO_TYPE: {
    id: "HERO_TYPE",
    name: ARCHETYPE_LABELS.HERO_TYPE,
    block: { xFrac: 0.06, widthFrac: 0.88, yFrac: 0.08, vAlign: "top", hAlign: "center", sideAware: false },
    headline: { case: "upper", fit: "fill", scaleFrac: 0.17, lineHeight: 0.98, maxLines: 3, weight: 800 },
    subhead: { scaleFrac: 0.032, lineHeight: 1.3, maxLines: 2 },
    checklist: { scaleFrac: 0.028, maxItems: 3, inlineMax: 2 },
    price: null,
    cta: { scaleFrac: 0.026, place: "bottomCenter" },
    logoSlot: { corner: "br", widthFrac: 0.09 },
    scrim: { enabled: true, maxDarkness: 0.4 },
    compatibleMoods: ALL_MOODS,
    aspectOverrides: {
      // Story/portrait: headline in the top third, more vertical breathing.
      "9:16": { block: { yFrac: 0.06 } },
      "4:5": { block: { yFrac: 0.07 } },
      // Landscape is short — fewer lines, smaller cap so it never overflows.
      "1.91:1": { block: { yFrac: 0.1, widthFrac: 0.9 }, headline: { scaleFrac: 0.14, maxLines: 2 } },
      "16:9": { block: { yFrac: 0.1, widthFrac: 0.9 }, headline: { scaleFrac: 0.15, maxLines: 2 } },
    },
  },
  // The classic split — reproduces the pre-Phase-2 layout (back-compat default).
  HERO_LEFT: {
    id: "HERO_LEFT",
    name: ARCHETYPE_LABELS.HERO_LEFT,
    block: { xFrac: 0.05, widthFrac: 0.4, yFrac: 0.5, vAlign: "center", hAlign: "left", sideAware: true },
    headline: { case: "title", fit: "fixed", scaleFrac: 0.064, lineHeight: 1.06, maxLines: 4, weight: 600 },
    subhead: { scaleFrac: 0.025, lineHeight: 1.4, maxLines: 3 },
    checklist: null,
    price: null,
    cta: { scaleFrac: 0.023, place: "flow" },
    logoSlot: { corner: "tr", widthFrac: 0.08 },
    scrim: { enabled: true, maxDarkness: 0.35 },
    compatibleMoods: ALL_MOODS,
    aspectOverrides: {
      "9:16": { block: { widthFrac: 0.5 } },
      "4:5": { block: { widthFrac: 0.46 } },
      // Landscape: a wider column, smaller headline so it fits the short height.
      "1.91:1": { block: { widthFrac: 0.52 }, headline: { scaleFrac: 0.058, maxLines: 3 } },
      "16:9": { block: { widthFrac: 0.5 }, headline: { scaleFrac: 0.06, maxLines: 3 } },
    },
  },
  // Background dominant; a text band sits across the bottom third.
  BANNER_BOTTOM: {
    id: "BANNER_BOTTOM",
    name: ARCHETYPE_LABELS.BANNER_BOTTOM,
    block: { xFrac: 0.06, widthFrac: 0.88, yFrac: 0.7, vAlign: "top", hAlign: "left", sideAware: false },
    headline: { case: "upper", fit: "fixed", scaleFrac: 0.076, lineHeight: 1.04, maxLines: 2, weight: 700 },
    subhead: { scaleFrac: 0.028, lineHeight: 1.3, maxLines: 1 },
    checklist: null,
    price: null,
    cta: { scaleFrac: 0.024, place: "flow" },
    logoSlot: { corner: "tl", widthFrac: 0.08 },
    scrim: { enabled: true, maxDarkness: 0.45 },
    compatibleMoods: ALL_MOODS,
    aspectOverrides: {
      // Keep the text band anchored to the bottom third as the canvas gets taller.
      "9:16": { block: { yFrac: 0.72 } },
      "4:5": { block: { yFrac: 0.71 } },
      // Landscape: band sits higher (short canvas), smaller headline, 2 lines.
      "1.91:1": { block: { yFrac: 0.56 }, headline: { scaleFrac: 0.07, maxLines: 2 } },
      "16:9": { block: { yFrac: 0.6 }, headline: { scaleFrac: 0.072, maxLines: 2 } },
    },
  },
  // Headline anchored in the calmer half of the bold-mood diagonal split.
  SPLIT_DIAGONAL: {
    id: "SPLIT_DIAGONAL",
    name: ARCHETYPE_LABELS.SPLIT_DIAGONAL,
    block: { xFrac: 0.06, widthFrac: 0.44, yFrac: 0.3, vAlign: "top", hAlign: "left", sideAware: true },
    headline: { case: "upper", fit: "fixed", scaleFrac: 0.072, lineHeight: 1.04, maxLines: 3, weight: 800 },
    subhead: { scaleFrac: 0.026, lineHeight: 1.3, maxLines: 2 },
    checklist: null,
    price: null,
    cta: { scaleFrac: 0.024, place: "bottomRight" },
    logoSlot: { corner: "br", widthFrac: 0.08 },
    scrim: { enabled: true, maxDarkness: 0.35 },
    compatibleMoods: ["bold", "energetic"],
    aspectOverrides: {
      "9:16": { block: { yFrac: 0.26, widthFrac: 0.5 } },
      "4:5": { block: { yFrac: 0.28, widthFrac: 0.48 } },
      "1.91:1": { block: { widthFrac: 0.5 }, headline: { scaleFrac: 0.06, maxLines: 2 } },
      "16:9": { block: { widthFrac: 0.48 }, headline: { scaleFrac: 0.062, maxLines: 2 } },
    },
  },
  // Benefit-rich: headline + subhead + checklist + price. Auto-selected for
  // copy-heavy briefs (see pickArchetype).
  TEXT_HEAVY: {
    id: "TEXT_HEAVY",
    name: ARCHETYPE_LABELS.TEXT_HEAVY,
    block: { xFrac: 0.06, widthFrac: 0.52, yFrac: 0.5, vAlign: "center", hAlign: "left", sideAware: true },
    headline: { case: "title", fit: "fixed", scaleFrac: 0.058, lineHeight: 1.05, maxLines: 3, weight: 700 },
    subhead: { scaleFrac: 0.026, lineHeight: 1.35, maxLines: 2 },
    checklist: { scaleFrac: 0.026, maxItems: 3, inlineMax: 2 },
    price: { scaleFrac: 0.03 },
    cta: { scaleFrac: 0.024, place: "flow" },
    logoSlot: { corner: "tr", widthFrac: 0.07 },
    scrim: { enabled: true, maxDarkness: 0.4 },
    compatibleMoods: ALL_MOODS,
    aspectOverrides: {
      // Portrait gives the stacked block more room — widen it a touch.
      "9:16": { block: { yFrac: 0.42, widthFrac: 0.6 } },
      "4:5": { block: { widthFrac: 0.56 } },
      // Landscape is cramped for benefit-rich copy — shrink type, cap lines.
      "1.91:1": { block: { widthFrac: 0.56 }, headline: { scaleFrac: 0.05, maxLines: 2 } },
      "16:9": { block: { widthFrac: 0.54 }, headline: { scaleFrac: 0.052, maxLines: 2 } },
    },
  },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Deep-merge an aspect override onto the base config (Part D populates overrides).
function deepMerge<T>(base: T, over: unknown): T {
  if (!isPlainObject(over)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = isPlainObject(v) && isPlainObject(b) ? deepMerge(b, v) : v;
  }
  return out as T;
}

// Resolve a config for a given aspect ratio. Part A is square-only, so this
// returns the base config; Part D fills aspectOverrides and this deep-merges.
export function resolveArchetypeConfig(archetype: Archetype, aspectRatio?: string): ArchetypeConfig {
  const base = ARCHETYPE_CONFIGS[archetype] ?? ARCHETYPE_CONFIGS.HERO_LEFT;
  const over = aspectRatio && base.aspectOverrides?.[aspectRatio];
  return over ? deepMerge(base, over) : base;
}

// A brief is "copy-heavy" (→ TEXT_HEAVY) when it carries a checklist or a price.
export function isCopyHeavy(opts: { benefits?: string[] | null; price?: string | null }): boolean {
  return (!!opts.benefits && opts.benefits.length >= 2) || !!(opts.price && opts.price.trim());
}

// Seeded archetype selection. Copy-heavy briefs get TEXT_HEAVY; otherwise pick a
// mood-compatible archetype from a decorrelated hash slice (>>12, unused by
// pickLever/pickStrategePalette). `avoid` powers the repeat guard.
export function pickArchetype(
  seed: string,
  mood: Mood,
  opts?: { copyHeavy?: boolean; avoid?: Archetype[] }
): Archetype {
  if (opts?.copyHeavy) return "TEXT_HEAVY";
  let pool = ARCHETYPES.filter(
    (a) => a !== "TEXT_HEAVY" && ARCHETYPE_CONFIGS[a].compatibleMoods.includes(mood)
  );
  if (!pool.length) pool = ARCHETYPES.filter((a) => a !== "TEXT_HEAVY");
  const avoid = opts?.avoid ?? [];
  let filtered = pool.filter((a) => !avoid.includes(a));
  if (!filtered.length) filtered = pool;
  return filtered[(fnv1a(seed) >> 12) % filtered.length];
}
