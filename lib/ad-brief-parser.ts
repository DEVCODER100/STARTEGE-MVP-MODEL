import { chat } from "./claude";

// Parses a free-form ad description (the Describe textarea) into structured
// fields. Anything not mentioned is null — the merger fills nulls with smart
// defaults. The textarea is the single source of truth.

export type RenderStyle = "3D" | "studio_photo" | "editorial" | "graphic_poster";
export type Position = "left" | "right" | "center";
export type Background = "gradient" | "solid" | "scene" | "texture";
export type Lighting = "soft_daylight" | "dramatic" | "studio" | "golden_hour";
export type Mood = "premium" | "playful" | "calm" | "bold" | "minimal";
export type LogoPos =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export interface ParsedBrief {
  colors: {
    primary: string | null;
    secondary: string | null;
    palette_name: string | null;
  };
  product: string | null; // the specific product the user NAMED, or null
  product_position: Position | null;
  render_style: RenderStyle | null;
  background: Background | null;
  lighting: Lighting | null;
  mood: Mood | null;
  logo_present: boolean;
  logo_position: LogoPos | null;
  headline_text: string | null;
  extra_notes: string | null;
}

export const EMPTY_PARSED: ParsedBrief = {
  colors: { primary: null, secondary: null, palette_name: null },
  product: null,
  product_position: null,
  render_style: null,
  background: null,
  lighting: null,
  mood: null,
  logo_present: false,
  logo_position: null,
  headline_text: null,
  extra_notes: null,
};

const SYSTEM = `You are a creative brief parser. Read the user's description of an ad they want generated. Extract these fields as JSON. If a field is not mentioned, set it to null — the system will fill nulls with smart defaults later.

{
  "colors": { "primary": "hex or null", "secondary": "hex or null", "palette_name": "string or null" },
  "product": "the SPECIFIC product the user explicitly named to feature (e.g. 'running shoes', 'a coffee mug', 'the X headset'), or null. Do NOT infer from a brand name; do NOT put a vague category ('gear', 'products', 'software'); only a concrete product the user actually named.",
  "product_position": "left|right|center or null",
  "render_style": "3D|studio_photo|editorial|graphic_poster or null",
  "background": "gradient|solid|scene|texture or null",
  "lighting": "soft_daylight|dramatic|studio|golden_hour or null",
  "mood": "premium|playful|calm|bold|minimal or null",
  "logo_present": true/false,
  "logo_position": "top-left|top-right|bottom-left|bottom-right|center or null",
  "headline_text": "string or null — only if user specified exact text",
  "extra_notes": "anything specific the user mentioned that doesn't fit above"
}

Output ONLY the JSON. No explanation.`;

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : null;
}
function hexOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/#?[0-9a-fA-F]{6}/);
  return m ? (m[0].startsWith("#") ? m[0] : "#" + m[0]).toUpperCase() : null;
}
function strOrNull(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s && s.toLowerCase() !== "null" ? s.slice(0, max) : null;
}

export async function parseDescription(text: string): Promise<ParsedBrief> {
  const input = text.trim();
  if (!input) return { ...EMPTY_PARSED };
  try {
    const r = await chat({
      model: "haiku",
      system: SYSTEM,
      temperature: 0.1,
      maxTokens: 500,
      messages: [{ role: "user", content: input }],
    });
    const s = r.text.indexOf("{");
    const e = r.text.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    const o = JSON.parse(r.text.slice(s, e + 1));
    const c = o.colors ?? {};
    return {
      colors: {
        primary: hexOrNull(c.primary),
        secondary: hexOrNull(c.secondary),
        palette_name: strOrNull(c.palette_name, 60),
      },
      product: strOrNull(o.product, 80),
      product_position: oneOf<Position>(o.product_position, ["left", "right", "center"]),
      render_style: oneOf<RenderStyle>(o.render_style, ["3D", "studio_photo", "editorial", "graphic_poster"]),
      background: oneOf<Background>(o.background, ["gradient", "solid", "scene", "texture"]),
      lighting: oneOf<Lighting>(o.lighting, ["soft_daylight", "dramatic", "studio", "golden_hour"]),
      mood: oneOf<Mood>(o.mood, ["premium", "playful", "calm", "bold", "minimal"]),
      logo_present: o.logo_present === true,
      logo_position: oneOf<LogoPos>(o.logo_position, ["top-left", "top-right", "bottom-left", "bottom-right", "center"]),
      headline_text: strOrNull(o.headline_text, 120),
      extra_notes: strOrNull(o.extra_notes, 400),
    };
  } catch {
    // If parsing fails, treat the whole text as extra notes so it still shapes
    // the image rather than being dropped.
    return { ...EMPTY_PARSED, extra_notes: input.slice(0, 400) };
  }
}
