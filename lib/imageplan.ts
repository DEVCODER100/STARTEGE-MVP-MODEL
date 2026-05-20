import { chat } from "./claude";
import {
  makeCreativeDirection,
  PLATFORM_LABELS,
  STYLE_LABELS,
  type CreativeDirection,
} from "./creative-direction";

// Stage 1 of image generation: Claude plans a TEXT-FREE scene + the overlay
// text separately. Ideogram never sees the text, so no garbled letters.

export interface ImagePlan {
  scene_prompt: string;
  headline: string;
  cta: string;
  direction: CreativeDirection;
}

const SYSTEM = `You are Stratege's creative director.

You plan ONE startup-aware marketing image. You are NOT making a generic poster.

Given the user's request, their startup profile, and the fixed creative direction, output STRICT JSON only - no prose, no markdown fences:
{
  "scene_prompt": "A vivid description of the IMAGE SCENE ONLY - product, setting, props, lighting, mood, colors, subject, camera, visual identity. Describe it like an art director. CRITICAL: do not mention any text, words, letters, signs, labels or captions - the scene must be purely visual.",
  "headline": "The main marketing text to display on the image. Punchy and clear. Match the startup and request.",
  "cta": "A 2-4 word call to action, or an empty string if none fits."
}

CREATIVE DIRECTION IS FIXED FOR THIS REQUEST:
You will receive Style, Platform, Layout, Palette, Energy, Image Treatment and Subject Hint.
Use those as hard constraints. The scene must feel specific to the startup/product/category, not like a generic founder stock image.

Examples:
- AI SaaS + Modern SaaS + LinkedIn: clean product UI, dashboard/device mockup, productivity, premium B2B trust.
- Fitness + Bold + Instagram: motion, athletic energy, strong contrast, visceral lifestyle moment.
- Luxury tech + Apple minimal + Website/Instagram: cinematic product, minimal industrial design, refined lighting.

CRITICAL RULE - USER'S CHOICE IS FINAL:
When the user's request specifies an exact hook, headline, or CTA (e.g. quoted text, or "headline: ...", "use this hook: ..."), you MUST use that exact text - word for word, character for character. Do NOT rewrite, rephrase, shorten, improve, or substitute it. Copy it verbatim into the "headline" or "cta" field.`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const s = candidate.indexOf("{");
  const e = candidate.lastIndexOf("}");
  return s !== -1 && e !== -1 ? candidate.slice(s, e + 1) : candidate;
}

function fallbackPlan(
  request: string,
  direction: CreativeDirection
): ImagePlan {
  const words = request.replace(/\s+/g, " ").trim().split(" ");
  return {
    scene_prompt: `${direction.subjectHint}. Marketing visual for: ${request}. Style: ${STYLE_LABELS[direction.style]}. Platform: ${PLATFORM_LABELS[direction.platform]}. Energy: ${direction.energy}. Purely visual, no text.`,
    headline: words.slice(0, 6).join(" ") || "Your brand",
    cta: "",
    direction,
  };
}

/**
 * Deterministically pull an explicit headline/CTA out of the user's request,
 * so the AI can NEVER override the user's chosen text.
 */
export function extractForcedText(request: string): {
  headline?: string;
  cta?: string;
} {
  const out: { headline?: string; cta?: string } = {};

  const h = request.match(
    /(?:headline|hook|title)\s*[:=]\s*["'“‘]?([^"'”’\n]{2,140})["'”’]?/i
  );
  if (h) out.headline = h[1].trim().replace(/[.\s]+$/, "");

  const c = request.match(
    /(?:cta|call[- ]to[- ]action|button)\s*[:=]\s*["'“‘]?([^"'”’\n]{2,60})["'”’]?/i
  );
  if (c) out.cta = c[1].trim().replace(/[.\s]+$/, "");

  if (!out.headline) {
    const q = request.match(/["“]([^"”]{3,140})["”]/);
    if (q) out.headline = q[1].trim();
  }

  return out;
}

export async function planImage(
  brand: Record<string, unknown>,
  request: string
): Promise<ImagePlan> {
  const direction = makeCreativeDirection(brand, request);
  const brandCtx = [
    brand.brand_name && `Brand: ${brand.brand_name}`,
    brand.role && `Founder role: ${brand.role}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.product && `Product: ${brand.product}`,
    brand.target_audience && `Audience: ${brand.target_audience}`,
    brand.usp && `Positioning / USP: ${brand.usp}`,
    brand.goal && `Goal: ${brand.goal}`,
    brand.content_style && `Founder tone / style: ${brand.content_style}`,
    brand.platforms &&
      `Preferred platforms: ${
        Array.isArray(brand.platforms)
          ? brand.platforms.join(", ")
          : brand.platforms
      }`,
    brand.brand_colors && `Brand colors: ${brand.brand_colors}`,
    brand.website && `Website: ${brand.website}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await chat({
      system: SYSTEM,
      model: "haiku",
      temperature: 0.65,
      maxTokens: 650,
      messages: [
        {
          role: "user",
          content: `Startup profile:
${brandCtx || "(not set)"}

Creative direction:
Style: ${STYLE_LABELS[direction.style]}
Platform: ${PLATFORM_LABELS[direction.platform]}
Layout family: ${direction.layout}
Palette: background ${direction.palette.bg} to ${direction.palette.bgEdge}, text ${direction.palette.text}, accent ${direction.palette.accent}
Typography density: ${direction.typography}
Energy: ${direction.energy}
Image treatment: ${direction.imageTreatment}
Subject hint: ${direction.subjectHint}

Image request:
${request}

Return the JSON.`,
        },
      ],
    });
    const obj = JSON.parse(extractJson(r.text));
    const fallback = fallbackPlan(request, direction);
    return {
      scene_prompt: String(obj.scene_prompt || "").trim() || fallback.scene_prompt,
      headline: String(obj.headline ?? "").trim() || fallback.headline,
      cta: String(obj.cta ?? "").trim(),
      direction,
    };
  } catch {
    return fallbackPlan(request, direction);
  }
}
