import { chat } from "./claude";
import { isStrategeBrand } from "./brand-locks";
import {
  type ResolvedBrief,
  type BriefImage,
  type Mood,
  type Platform,
  PLATFORM_ASPECT,
  isMood,
  isPlatform,
  stripChecks,
} from "./resolved-brief";

// The interpretation layer. One Claude call converts the founder's messy raw
// request + upload roles into a structured ResolvedBrief BEFORE any prompt is
// built. This is the step that "understands" — the rest of the pipeline only
// executes. Sits IN FRONT of the existing engine; changes nothing downstream.

const SYSTEM = `You translate a founder's messy, informal request into a structured ad brief.

Rules — absolute:
- NEVER invent a product. product.source is "uploaded" ONLY if a product_photo upload exists, "named" ONLY if the user's text names a specific product, otherwise "none".
- The brand name is NOT a product. Do not infer products from the brand.
- Fill gaps with sensible defaults and record EVERY guess in assumptions[] (short phrases, e.g. "assumed premium mood", "no platform given — defaulted to Instagram post").
- copy.headline: 2-5 punchy words in the brand's likely voice (or the exact text the user asked for). copy.cta: 1-3 words. copy.benefits: only if the user asked for benefits/checklist/features, max 3, no checkmark characters.
- mood: one of energetic | premium | minimal | warm | bold — infer from the request's tone; default "bold".
- platform: one of instagram_post | instagram_story | linkedin | twitter | facebook — infer ("insta"/"ig" → instagram_post unless story/reel is implied); default "instagram_post".

Respond with ONLY the JSON, no preamble, no markdown fences:
{
  "product": { "source": "uploaded|named|none", "name": "string or null" },
  "copy": { "headline": "...", "subhead": "string or null", "benefits": ["..."] or null, "cta": "...", "price": "string or null", "discount": "string or null" },
  "mood": "...",
  "platform": "...",
  "assumptions": ["..."]
}`;

export interface InterpretInput {
  text: string;
  images: BriefImage[];
  brand: Record<string, unknown>;
  referenceNotes?: string; // vision hints from a reference_style upload
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s && s.toLowerCase() !== "null" ? s.slice(0, max) : undefined;
}

function fallbackBrief(input: InterpretInput, flag: string): ResolvedBrief {
  const productPhoto = input.images.find((i) => i.role === "product_photo");
  return finalize(
    {
      product: productPhoto ? { source: "uploaded" } : { source: "none" },
      copy: { headline: "Made for you", cta: "Learn more" },
      mood: "bold",
      platform: "instagram_post",
      assumptions: [flag],
    },
    input
  );
}

// Enforce the hard invariants in CODE, not just in the prompt: the model's
// product claim is overridden by what actually exists.
function finalize(
  draft: {
    product: { source: "uploaded" | "named" | "none"; name?: string };
    copy: ResolvedBrief["copy"];
    mood: Mood;
    platform: Platform;
    assumptions: string[];
  },
  input: InterpretInput
): ResolvedBrief {
  const productPhoto = input.images.find((i) => i.role === "product_photo");
  let product: ResolvedBrief["product"];
  if (productPhoto) {
    product = { source: "uploaded", imageId: productPhoto.id, name: draft.product.name };
  } else if (draft.product.source === "named" && draft.product.name) {
    product = { source: "named", name: draft.product.name };
  } else {
    product = { source: "none" };
  }

  const palette = String(input.brand.brand_colors ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^#?[0-9a-fA-F]{3,8}$/.test(c))
    .slice(0, 5);

  return {
    brand: {
      name: String(input.brand.brand_name ?? "your brand").slice(0, 120),
      palette,
      isStratege: isStrategeBrand(input.brand),
    },
    product,
    uploadedImages: input.images,
    copy: {
      headline: draft.copy.headline,
      subhead: draft.copy.subhead,
      benefits: draft.copy.benefits?.map((b) => stripChecks(b)).filter(Boolean).slice(0, 3),
      cta: draft.copy.cta,
      price: draft.copy.price,
      discount: draft.copy.discount,
    },
    mood: draft.mood,
    platform: draft.platform,
    aspectRatio: PLATFORM_ASPECT[draft.platform],
    assumptions: draft.assumptions.slice(0, 8),
  };
}

export async function interpretBrief(input: InterpretInput): Promise<ResolvedBrief> {
  const roles = input.images.map((i) => i.role);
  const ctx = [
    `Brand: ${String(input.brand.brand_name ?? "(unknown)")}`,
    input.brand.product && `Brand's product line (CONTEXT ONLY — not a product request): ${input.brand.product}`,
    input.brand.content_style && `Brand tone: ${input.brand.content_style}`,
    roles.length
      ? `Uploaded images and their roles: ${roles.join(", ")}`
      : "Uploaded images: none",
    input.referenceNotes && `Style-reference hints (from an uploaded reference image): ${input.referenceNotes}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await chat({
      model: "sonnet",
      system: SYSTEM,
      temperature: 0.3,
      maxTokens: 500,
      messages: [{ role: "user", content: `${ctx}\n\nFounder's request:\n"""${input.text.trim().slice(0, 1500)}"""` }],
    });
    // Defensive parse: strip fences, find the outermost JSON object.
    const cleaned = r.text.replace(/```(json)?/gi, "");
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    const o = JSON.parse(cleaned.slice(s, e + 1));

    const headline = str(o?.copy?.headline, 60);
    const cta = str(o?.copy?.cta, 24);
    if (!headline || !cta) throw new Error("missing copy");

    const mood: Mood = isMood(o.mood) ? o.mood : "bold";
    const platform: Platform = isPlatform(o.platform) ? o.platform : "instagram_post";
    const source =
      o?.product?.source === "uploaded" || o?.product?.source === "named" || o?.product?.source === "none"
        ? o.product.source
        : "none";

    return finalize(
      {
        product: { source, name: str(o?.product?.name, 80) },
        copy: {
          headline,
          subhead: str(o?.copy?.subhead, 90),
          benefits: Array.isArray(o?.copy?.benefits)
            ? o.copy.benefits.map((b: unknown) => str(b, 28)).filter(Boolean) as string[]
            : undefined,
          cta,
          price: str(o?.copy?.price, 20),
          discount: str(o?.copy?.discount, 20),
        },
        mood,
        platform,
        assumptions: Array.isArray(o.assumptions)
          ? (o.assumptions.map((a: unknown) => str(a, 90)).filter(Boolean) as string[])
          : [],
      },
      input
    );
  } catch {
    return fallbackBrief(input, "interpreter unavailable — used a minimal default brief");
  }
}
