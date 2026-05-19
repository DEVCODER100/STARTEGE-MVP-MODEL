import { chat } from "./claude";

// Stage 1 of image generation: Claude plans a TEXT-FREE scene + the overlay
// text separately. Ideogram never sees the text → no garbled letters.

export interface ImagePlan {
  scene_prompt: string; // text-free visual description for Ideogram
  headline: string; // overlaid by our code (perfect spelling)
  cta: string; // optional short call to action
}

const SYSTEM = `You plan ONE marketing image for a small business.

Given the user's request and their brand profile, output STRICT JSON only — no prose, no markdown fences:
{
  "scene_prompt": "A vivid description of the IMAGE SCENE ONLY — product, setting, props, lighting, mood, colors. Describe it like a photograph. CRITICAL: do not mention any text, words, letters, signs, labels or captions — the scene must be purely visual.",
  "headline": "The main marketing text to display on the image. Punchy and clear. Match the brand's language.",
  "cta": "A 2-4 word call to action, or an empty string if none fits."
}

CRITICAL RULE — USER'S CHOICE IS FINAL:
When the user's request specifies an exact hook, headline, or CTA (e.g. quoted text, or "headline: ...", "use this hook: ..."), you MUST use that exact text — word for word, character for character. Do NOT rewrite, rephrase, shorten, "improve", or substitute it. Copy it verbatim into the "headline" (or "cta") field. The user's choice is final.`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const s = candidate.indexOf("{");
  const e = candidate.lastIndexOf("}");
  return s !== -1 && e !== -1 ? candidate.slice(s, e + 1) : candidate;
}

function fallbackPlan(request: string): ImagePlan {
  const words = request.replace(/\s+/g, " ").trim().split(" ");
  return {
    scene_prompt: `A clean, professional marketing scene for: ${request}. Soft natural lighting, appealing composition, no text.`,
    headline: words.slice(0, 6).join(" ") || "Your brand",
    cta: "",
  };
}

/**
 * Deterministically pull an explicit headline/CTA out of the user's request,
 * so the AI can NEVER override the user's chosen text.
 * Recognises: headline:/hook:/title: markers, cta:/call to action: markers,
 * and a bare quoted phrase (treated as the headline).
 */
export function extractForcedText(request: string): {
  headline?: string;
  cta?: string;
} {
  const out: { headline?: string; cta?: string } = {};

  const h = request.match(
    /(?:headline|hook|title)\s*[:=]\s*["“'']?([^"”''\n]{2,140})["”'']?/i
  );
  if (h) out.headline = h[1].trim().replace(/[.\s]+$/, "");

  const c = request.match(
    /(?:cta|call[- ]to[- ]action|button)\s*[:=]\s*["“'']?([^"”''\n]{2,60})["”'']?/i
  );
  if (c) out.cta = c[1].trim().replace(/[.\s]+$/, "");

  // No marker but a quoted phrase → treat the quote as the chosen headline.
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
  const brandCtx = [
    brand.brand_name && `Brand: ${brand.brand_name}`,
    brand.product && `Product: ${brand.product}`,
    brand.target_audience && `Audience: ${brand.target_audience}`,
    brand.brand_colors && `Colors: ${brand.brand_colors}`,
    brand.language && `Language: ${brand.language}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await chat({
      system: SYSTEM,
      model: "haiku",
      temperature: 0.7,
      maxTokens: 500,
      messages: [
        {
          role: "user",
          content: `Brand profile:\n${brandCtx || "(not set)"}\n\nImage request: ${request}\n\nReturn the JSON.`,
        },
      ],
    });
    const obj = JSON.parse(extractJson(r.text));
    return {
      scene_prompt: String(obj.scene_prompt || "").trim() || fallbackPlan(request).scene_prompt,
      headline: String(obj.headline ?? "").trim(),
      cta: String(obj.cta ?? "").trim(),
    };
  } catch {
    return fallbackPlan(request);
  }
}
