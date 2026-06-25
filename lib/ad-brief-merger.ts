import { PALETTES, COLOR_COMBO_IDS, type ColorCombo } from "./ad-brief";
import { pickLever, resolveCombo, type MergedBrief } from "./ad-prompt-builder";
import { resolveBrandColor } from "./creative-direction";
import type {
  ParsedBrief,
  RenderStyle,
  Background,
  Lighting,
} from "./ad-brief-parser";

// Takes a parsed brief (mostly nulls) + the brand profile + a deterministic
// seed, and fills every null with a smart default so the prompt builder always
// has concrete values.

export type { MergedBrief };

const RENDER_PHRASE: Record<RenderStyle, string> = {
  "3D": "3D octane render, dramatic studio lighting",
  studio_photo: "high-end studio product photography, soft cinematic lighting",
  editorial: "editorial product photo, crisp detail",
  graphic_poster: "graphic poster design, bold flat shapes",
};
const BG_PHRASE: Record<Background, string> = {
  gradient: "smooth gradient",
  solid: "solid color field",
  scene: "real environment scene",
  texture: "subtle textured surface",
};
const LIGHTING_PHRASE: Record<Lighting, string> = {
  soft_daylight: "soft daylight",
  dramatic: "dramatic lighting",
  studio: "studio lighting",
  golden_hour: "golden-hour light",
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Pick a render style appropriate to the brand category; fall back to the
// rotating lever default when the category is unknown.
function renderForBrand(brand: Record<string, unknown>, fallback: string): string {
  const cat = `${brand.industry ?? ""} ${brand.product ?? ""} ${brand.content_style ?? ""}`.toLowerCase();
  if (/\b(saas|software|app|platform|api|tech|developer)\b/.test(cat)) return RENDER_PHRASE["3D"];
  if (/\b(d2c|ecommerce|e-commerce|product|store|shop|brand|retail|skincare|fashion|food|textile)\b/.test(cat)) return RENDER_PHRASE.studio_photo;
  if (/\b(service|agency|consult|coach|studio|freelance)\b/.test(cat)) return RENDER_PHRASE.editorial;
  return fallback;
}

export function mergeWithDefaults(
  parsed: ParsedBrief,
  brand: Record<string, unknown>,
  seed: string
): MergedBrief {
  const lever = pickLever(seed);

  // Colors: explicit pair → named palette → single + cream → brand → rotate.
  let colors: [string, string];
  if (parsed.colors.primary && parsed.colors.secondary) {
    colors = [parsed.colors.primary, parsed.colors.secondary];
  } else if (parsed.colors.palette_name) {
    const wanted = parsed.colors.palette_name.toLowerCase();
    const match = (Object.values(PALETTES)).find((p) => p.name.toLowerCase() === wanted);
    colors = match ? [match.colorA, match.colorB] : resolveCombo("brand", brand);
  } else if (parsed.colors.primary) {
    colors = [parsed.colors.primary, "#F5F1EA"];
  } else if (resolveBrandColor(String(brand.brand_colors ?? ""))) {
    colors = resolveCombo("brand", brand);
  } else {
    const ids = COLOR_COMBO_IDS.filter((i) => i !== "brand") as ColorCombo[];
    const id = ids[hash(seed) % ids.length];
    colors = [PALETTES[id].colorA, PALETTES[id].colorB];
  }

  return {
    colors,
    side: parsed.product_position ?? lever.side,
    render: parsed.render_style ? RENDER_PHRASE[parsed.render_style] : renderForBrand(brand, lever.render),
    bg: parsed.background ? BG_PHRASE[parsed.background] : lever.bg,
    font: lever.font,
    lighting: parsed.lighting ? LIGHTING_PHRASE[parsed.lighting] : null,
    mood: parsed.mood,
    logo: parsed.logo_present ? { position: parsed.logo_position ?? "bottom-right" } : null,
    headline_text: parsed.headline_text,
    extra_notes: parsed.extra_notes,
  };
}
