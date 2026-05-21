import { chat } from "./claude";
import {
  makeCreativeDirection,
  detectPlatform,
  styleFromText,
  isVisualStyle,
  isDarkStyle,
  resolveBrandColor,
  paletteFromAccent,
  PLATFORM_LABELS,
  STYLE_LABELS,
  type CreativeDirection,
  type VisualStyle,
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

Given the user's request and their startup profile, output STRICT JSON only - no prose, no markdown fences:
{
  "style": "ONE style id that best fits THIS startup/product (see allowed list below). Choose the visual identity that a great brand designer would pick for this specific company — an AI SaaS is not a fitness brand is not a luxury watch.",
  "accent_hex": "#RRGGBB — ONE brand-appropriate accent color for THIS specific startup. Pick a color that fits the product, category and emotion (e.g. fintech → confident blue, fitness → energetic orange/red, luxury → gold or graphite, eco → green, playful consumer → pink/purple). Two different startups must get visibly different colors.",
  "scene_prompt": "A vivid description of the IMAGE SCENE ONLY - product, setting, props, lighting, mood, colors, subject, camera, visual identity. Describe it like an art director. CRITICAL: do not mention any text, words, letters, signs, labels or captions - the scene must be purely visual.",
  "headline": "The main marketing text to display on the image. Punchy and clear. Match the startup and request.",
  "cta": "A 2-4 word call to action, or an empty string if none fits."
}

ALLOWED STYLE IDS (pick exactly one for "style"):
premium, modern_saas, minimal, aesthetic, bold, luxury, editorial, corporate, futuristic, gen_z, dark_mode, startup_clean, apple_minimal, stripe_saas

HOW TO CHOOSE THE STYLE — be specific to the business:
- AI / SaaS / dev tools / B2B software → modern_saas, stripe_saas, futuristic, or dark_mode
- Fitness / sports / energy / bold consumer → bold or gen_z
- Luxury / jewellery / watches / high-end / premium consumer tech → luxury or apple_minimal
- Skincare / beauty / wellness / lifestyle → aesthetic or editorial
- Agencies / enterprise / finance / professional services → corporate or editorial
- Indie maker / small startup / clean & simple → startup_clean or minimal
Do NOT default everything to the same style. The whole point is that two different startups look visibly different.

The "scene_prompt" must match the chosen style and feel specific to the startup's product category and audience — never a generic founder-at-laptop stock image unless that truly is the product.

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
  // If the user explicitly named a style/platform in their request, that is final.
  const explicitStyle = styleFromText(request);
  const platform = detectPlatform(request, brand);

  // Initial direction (used for the prompt + as a safe fallback).
  const direction = makeCreativeDirection(
    brand,
    request,
    explicitStyle ? { style: explicitStyle, platform } : { platform }
  );
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

    // Resolve the final style:
    //  1. explicit user request wins,
    //  2. else Claude's startup-aware pick,
    //  3. else the regex-detected default.
    let finalStyle: VisualStyle = direction.style;
    if (explicitStyle) {
      finalStyle = explicitStyle;
    } else {
      const claudeStyle = String(obj.style ?? "").trim();
      if (isVisualStyle(claudeStyle)) finalStyle = claudeStyle;
    }

    let finalDirection =
      finalStyle === direction.style
        ? direction
        : makeCreativeDirection(brand, request, { style: finalStyle, platform });

    // Color identity priority:
    //   1. the founder's REAL brand color (from onboarding/scrape) — handled
    //      inside makeCreativeDirection,
    //   2. else Claude's startup-appropriate accent (so every startup gets a
    //      distinct, fitting color even when no brand color was captured).
    const hasRealColor = !!resolveBrandColor(String(brand.brand_colors ?? ""));
    if (!hasRealColor) {
      const m = String(obj.accent_hex ?? "").match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
      const claudeAccent = resolveBrandColor(m ? m[0] : "");
      if (claudeAccent) {
        finalDirection = {
          ...finalDirection,
          palette: paletteFromAccent(claudeAccent, isDarkStyle(finalStyle)),
        };
      }
    }

    const fallback = fallbackPlan(request, finalDirection);
    return {
      scene_prompt:
        String(obj.scene_prompt || "").trim() || fallback.scene_prompt,
      headline: String(obj.headline ?? "").trim() || fallback.headline,
      cta: String(obj.cta ?? "").trim(),
      direction: finalDirection,
    };
  } catch {
    return fallbackPlan(request, direction);
  }
}
