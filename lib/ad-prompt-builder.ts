import { resolveBrandColor } from "./creative-direction";
import type { AdBrief, AdCopy, AdLever, ColorCombo } from "./ad-brief";

// Builds the 6-part ad prompt that reliably produces clean, ready-to-post
// product ads with Ideogram 4.0 (native text rendering). Uniqueness comes from
// rotating a few "levers" (color pair, product side, render style, font, bg)
// off a deterministic seed, so "make another one" varies but a single ad is
// reproducible.

// Curated gradient pairs (colorA = darker/anchor, colorB = accent).
const COMBOS: Record<Exclude<ColorCombo, "brand">, [string, string]> = {
  indigo_violet: ["#312E81", "#A855F7"],
  teal_emerald: ["#0F766E", "#34D399"],
  orange_rose: ["#C2410C", "#FB7185"],
  slate_cyan: ["#1E293B", "#22D3EE"],
  black_gold: ["#141414", "#D4AF37"],
};

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
    return COMBOS.indigo_violet;
  }
  return COMBOS[combo];
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
${ctaLine}Minimal, high-contrast, magazine-grade, crisp typography, social-media ready, ready to post.`;
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
