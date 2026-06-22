// Ad Studio brief — the v2 image flow.
// Users generate clean, ready-to-post product ads where IDEOGRAM renders the
// headline/subheadline/CTA natively inside the image (no code overlay).
//
// Flow: product (photo upload OR typed name) → [mode if photo] → color combo
//       → AI auto-writes the copy → Ideogram → return.

export type ProductSource = "upload" | "text";
export type AdMode = "exact" | "lookalike";

export type ColorCombo =
  | "brand"
  | "indigo_violet"
  | "teal_emerald"
  | "orange_rose"
  | "slate_cyan"
  | "black_gold";

export interface AdCopy {
  headline: string;
  subhead: string;
  cta: string;
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
};

export const COLOR_COMBO_IDS: ColorCombo[] = [
  "brand",
  "indigo_violet",
  "teal_emerald",
  "orange_rose",
  "slate_cyan",
  "black_gold",
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
