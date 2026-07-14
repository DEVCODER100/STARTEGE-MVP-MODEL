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
  isArchetype,
  stripChecks,
} from "./resolved-brief";
import { pickArchetype, isCopyHeavy } from "./layout-archetypes";

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

  const benefits = draft.copy.benefits?.map((b) => stripChecks(b)).filter(Boolean).slice(0, 3);

  // Provisional, deterministic archetype so the confirmation card names a stable
  // style without a DB read. The route's repeat guard may re-roll before render.
  const archetype = pickArchetype(
    `${String(input.brand.brand_name ?? "")}:${draft.mood}:${draft.platform}`,
    draft.mood,
    { copyHeavy: isCopyHeavy({ benefits, price: draft.copy.price }) }
  );

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
      benefits,
      cta: draft.copy.cta,
      price: draft.copy.price,
      discount: draft.copy.discount,
    },
    mood: draft.mood,
    platform: draft.platform,
    aspectRatio: PLATFORM_ASPECT[draft.platform],
    archetype,
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

// ─── EDIT mode (Part C) ──────────────────────────────────────────────────────
// The payoff of the interpretation layer: apply ONE conversational change to an
// existing ad, keeping everything else identical. Never invents a product. The
// route decides text-side (free Sharp re-render) vs background-side (regen) —
// but we also classify here so the confirmation copy is right.

export interface EditableAd {
  headline: string;
  subhead?: string;
  cta: string;
  benefits?: string[];
  price?: string;
  discount?: string;
  mood?: string;
  archetype: string; // Archetype id
  logoCorner?: string; // tl | tr | bl | br | bc
}

export interface EditOutcome {
  changes: string[]; // human-readable, for the confirmation card
  kind: "text" | "background"; // text → free re-render; background → 1 credit
  next: EditableAd; // the full spec with the change applied
}

const CORNERS = ["tl", "tr", "bl", "br", "bc"];

const EDIT_SYSTEM = `You revise ONE advertisement spec by applying ONLY the change the user asks for. Keep every other field EXACTLY as given — never rewrite copy the user didn't mention, never invent or change the product.

Respond with ONLY JSON, no preamble or fences:
{
  "next": { "headline": "...", "subhead": "string or null", "cta": "...", "benefits": ["..."] or null, "price": "string or null", "discount": "string or null", "mood": "...", "archetype": "...", "logoCorner": "tl|tr|bl|br|bc or null" },
  "changes": ["one short phrase per change"]
}

Rules:
- "next" is the CURRENT spec with the requested change applied — copy every unchanged field through verbatim.
- mood ∈ energetic|premium|minimal|warm|bold. archetype ∈ HERO_TYPE|HERO_LEFT|BANNER_BOTTOM|SPLIT_DIAGONAL|TEXT_HEAVY. logoCorner ∈ tl|tr|bl|br|bc.
- Map style requests: "big headline"/"bigger text"/"hero"/"bold display" → HERO_TYPE; "classic"/"left" → HERO_LEFT; "bottom"/"banner" → BANNER_BOTTOM; "diagonal"/"split" → SPLIT_DIAGONAL; "detailed"/"features"/"checklist"/"benefits list" → TEXT_HEAVY.
- "move logo top left" → logoCorner "tl"; top right → "tr"; bottom left → "bl"; bottom right → "br"; center → "bc".
- changes: short phrases like "Headline → 'SHIP FASTER'", "CTA → 'Buy Now'", "Mood → premium", "Style → Big headline", "Logo → top-left".
- Ambiguous request ("make it pop") → make the single smallest concrete change (e.g. archetype → HERO_TYPE) and say what you assumed in changes.
- If nothing actionable, return next = current unchanged and changes = [].`;

export async function interpretEdit(current: EditableAd, editRequest: string): Promise<EditOutcome> {
  const fallback: EditOutcome = { changes: [], kind: "text", next: current };
  try {
    const r = await chat({
      model: "sonnet",
      system: EDIT_SYSTEM,
      temperature: 0.2,
      maxTokens: 400,
      messages: [
        {
          role: "user",
          content: `Current spec:\n${JSON.stringify(current)}\n\nUser's edit:\n"""${editRequest.trim().slice(0, 500)}"""`,
        },
      ],
    });
    const cleaned = r.text.replace(/```(json)?/gi, "");
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) return fallback;
    const o = JSON.parse(cleaned.slice(s, e + 1));
    const n = o?.next ?? {};

    // Validate + coerce; anything invalid falls back to the current value, so a
    // model slip can never corrupt the spec.
    const next: EditableAd = {
      headline: str(n.headline, 60) ?? current.headline,
      subhead: str(n.subhead, 90) ?? current.subhead,
      cta: str(n.cta, 24) ?? current.cta,
      benefits: Array.isArray(n.benefits)
        ? (n.benefits.map((b: unknown) => stripChecks(str(b, 28) ?? "")).filter(Boolean).slice(0, 3) as string[])
        : current.benefits,
      price: str(n.price, 20) ?? current.price,
      discount: str(n.discount, 20) ?? current.discount,
      mood: isMood(n.mood) ? n.mood : current.mood,
      archetype: isArchetype(n.archetype) ? n.archetype : current.archetype,
      logoCorner:
        typeof n.logoCorner === "string" && CORNERS.includes(n.logoCorner)
          ? n.logoCorner
          : current.logoCorner,
    };

    // Authoritative classification: a mood change needs a new Ideogram bg; every
    // other edit (copy / archetype / logo slot) is a free Sharp re-render.
    const kind: "text" | "background" = next.mood !== current.mood ? "background" : "text";

    const changes = Array.isArray(o.changes)
      ? (o.changes.map((c: unknown) => str(c, 80)).filter(Boolean) as string[]).slice(0, 6)
      : [];

    return { changes, kind, next };
  } catch {
    return fallback;
  }
}
