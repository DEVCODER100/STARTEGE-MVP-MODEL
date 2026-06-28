// Ad Studio brief — the v2 image flow.
// Users generate clean, ready-to-post product ads where IDEOGRAM renders the
// headline/subheadline/CTA natively inside the image (no code overlay).
//
// Flow: product (photo upload OR typed name) → [mode if photo] → color combo
//       → AI auto-writes the copy → Ideogram → return.

export type ProductSource = "upload" | "text" | "screenshot";
export type AdMode = "exact" | "lookalike";

export type ColorCombo =
  | "brand"
  | "indigo_violet"
  | "teal_emerald"
  | "orange_rose"
  | "slate_cyan"
  | "black_gold"
  | "sage_sand"
  | "terracotta_cream"
  | "navy_silver";

// Full palette metadata: display name, the two hexes, and the sentence that
// gets appended to the Describe textarea when the card is clicked.
export interface Palette {
  name: string;
  colorA: string;
  colorB: string;
  description_text: string;
}

export const PALETTES: Record<ColorCombo, Palette> = {
  brand: {
    name: "Brand",
    colorA: "#1D9E75",
    colorB: "#F5F1EA",
    description_text: "Use my brand colors from my profile.",
  },
  indigo_violet: {
    name: "Indigo + Violet",
    colorA: "#312E81",
    colorB: "#A855F7",
    description_text: "Use the Indigo + Violet palette (deep indigo #312E81, bright violet #A855F7).",
  },
  teal_emerald: {
    name: "Teal + Emerald",
    colorA: "#0F766E",
    colorB: "#34D399",
    description_text: "Use the Teal + Emerald palette (deep teal #0F766E, soft emerald #34D399).",
  },
  orange_rose: {
    name: "Orange + Rose",
    colorA: "#C2410C",
    colorB: "#FB7185",
    description_text: "Use the Orange + Rose palette (burnt orange #C2410C, soft rose #FB7185).",
  },
  slate_cyan: {
    name: "Slate + Cyan",
    colorA: "#1E293B",
    colorB: "#22D3EE",
    description_text: "Use the Slate + Cyan palette (deep slate #1E293B, bright cyan #22D3EE).",
  },
  black_gold: {
    name: "Black + Gold",
    colorA: "#141414",
    colorB: "#D4AF37",
    description_text: "Use the Black + Gold palette (near-black #141414, warm gold #D4AF37).",
  },
  sage_sand: {
    name: "Sage + Sand",
    colorA: "#9CAF88",
    colorB: "#E8DCC4",
    description_text: "Use the Sage + Sand palette (soft sage green #9CAF88, warm sand #E8DCC4).",
  },
  terracotta_cream: {
    name: "Terracotta + Cream",
    colorA: "#C06B4F",
    colorB: "#F0E6D2",
    description_text: "Use the Terracotta + Cream palette (warm terracotta #C06B4F, soft cream #F0E6D2).",
  },
  navy_silver: {
    name: "Navy + Silver",
    colorA: "#1E3A5F",
    colorB: "#C0C7D0",
    description_text: "Use the Navy + Silver palette (deep navy #1E3A5F, cool silver #C0C7D0).",
  },
};

// ─── Creative styles (4) ────────────────────────────────────────────────────
export type StyleId =
  | "product_hero"
  | "editorial_story"
  | "modern_system"
  | "bold_poster";

export interface AdStyle {
  name: string;
  description: string;
  description_text: string;
  default_render: string;
}

export const STYLES: Record<StyleId, AdStyle> = {
  product_hero: {
    name: "Product hero",
    description: "Single product, precise lighting, generous negative space",
    description_text:
      "Style: product hero — single product on clean ground, precise studio lighting, generous negative space.",
    default_render: "high-end studio product photography, soft cinematic lighting",
  },
  editorial_story: {
    name: "Editorial story",
    description: "Human moment, asymmetrical crop, story-first frame",
    description_text:
      "Style: editorial story — human moment, asymmetrical crop, magazine-quality framing.",
    default_render: "editorial product photo, crisp detail",
  },
  modern_system: {
    name: "Modern system",
    description: "Interface fragments, modular geometry, product in context",
    description_text:
      "Style: modern system — interface fragments, modular geometry, product shown in context.",
    default_render: "3D octane render, dramatic studio lighting",
  },
  bold_poster: {
    name: "Bold poster",
    description: "Typographic, high contrast, scroll-stopping",
    description_text:
      "Style: bold poster — typographic-led composition, high contrast, scroll-stopping.",
    default_render: "graphic poster design, bold flat shapes",
  },
};

export const STYLE_IDS: StyleId[] = [
  "product_hero",
  "editorial_story",
  "modern_system",
  "bold_poster",
];

export interface AdCopy {
  headline: string;
  subhead: string;
  cta: string;
  bullets?: string[]; // optional 3 short feature points for rich poster ads
}

export interface AdLever {
  side: "left" | "right" | "center";
  render: string;
  font: string;
  bg: string;
}

// The fields we still need to ask the user. Copy is never asked — it's
// auto-written and editable afterward via natural language.
export type AdField = "mode" | "color";

export interface AdBrief {
  v: 2;
  request: string;
  productSource: ProductSource;
  productName?: string;
  photoUrl?: string; // stored blob/public URL — never base64
  productDescription?: string; // vision output, cached for edits
  mode?: AdMode; // only relevant when productSource === "upload"
  frame?: string; // device frame, only when productSource === "screenshot"
  color?: ColorCombo;
  copy?: AdCopy;
  lever?: AdLever;
}

export const AD_MODE_LABELS: Record<AdMode, string> = {
  exact: "Keep my exact product",
  lookalike: "Generate a stylized version",
};

export const COLOR_COMBO_LABELS: Record<ColorCombo, string> = {
  brand: "Use my brand colors",
  indigo_violet: "Indigo + Violet",
  teal_emerald: "Teal + Emerald",
  orange_rose: "Orange + Rose",
  slate_cyan: "Slate + Cyan",
  black_gold: "Black + Gold",
  sage_sand: "Sage + Sand",
  terracotta_cream: "Terracotta + Cream",
  navy_silver: "Navy + Silver",
};

export const COLOR_COMBO_IDS: ColorCombo[] = [
  "brand",
  "indigo_violet",
  "teal_emerald",
  "orange_rose",
  "slate_cyan",
  "black_gold",
  "sage_sand",
  "terracotta_cream",
  "navy_silver",
];

export const AD_MODE_IDS: AdMode[] = ["exact", "lookalike"];

// Type guards for validating chip answers coming off the wire.
export function isAdMode(v: string): v is AdMode {
  return (AD_MODE_IDS as string[]).includes(v);
}
export function isColorCombo(v: string): v is ColorCombo {
  return (COLOR_COMBO_IDS as string[]).includes(v);
}

export function isAdBrief(b: unknown): b is AdBrief {
  return !!b && typeof b === "object" && (b as { v?: number }).v === 2;
}

// State machine: ask mode (only for uploads), then color. Copy is automatic.
export function nextAdQuestion(brief: AdBrief): AdField | null {
  if (brief.productSource === "upload" && !brief.mode) return "mode";
  if (!brief.color) return "color";
  return null;
}
