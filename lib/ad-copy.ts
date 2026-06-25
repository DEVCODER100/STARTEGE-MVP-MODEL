import { chat } from "./claude";
import type { AdCopy, ColorCombo } from "./ad-brief";
import { COLOR_COMBO_IDS } from "./ad-brief";
import {
  isStrategeBrand,
  isBannedHeadline,
  isBannedCta,
  STRATEGE_HEADLINE_GUIDE,
  STRATEGE_SUBHEAD_GUIDE,
  STRATEGE_CTA_GUIDE,
  strategeHeadlineFallback,
  strategeSubheadFallback,
  strategeCtaFallback,
} from "./brand-locks";

function smallHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const cleanStr = (v: unknown, max: number) =>
  String(v ?? "").trim().replace(/^["']|["']$/g, "").slice(0, max);

// AI copywriting for the Ad Studio flow:
//  - describeProduct(): Claude vision summarises the uploaded photo (so the
//    prompt builder / lookalike generation knows the real product).
//  - writeAdCopy(): writes the headline / subheadline / CTA that Ideogram
//    renders natively, and suggests a color combo.

const DESCRIBE_SYSTEM = `You describe ONLY the physical product in the image for an ad designer.
Rules:
- 30 words max, one sentence, no preamble.
- Mention the object, material, color, finish, and shape.
- IGNORE any background, surface, text, logo, or watermark.
- Do not invent a brand name. Output the description text only.`;

export async function describeProduct(
  photoDataUri: string
): Promise<string> {
  try {
    const r = await chat({
      // Vision: use Sonnet for reliable image understanding.
      model: "sonnet",
      system: DESCRIBE_SYSTEM,
      temperature: 0.2,
      maxTokens: 120,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe the product in this image." },
            { type: "image_url", image_url: { url: photoDataUri } },
          ],
        },
      ],
    });
    return r.text.trim().replace(/^["']|["']$/g, "").slice(0, 240);
  } catch {
    return "";
  }
}

const COPY_SYSTEM = `You write the on-image text for a clean, modern social-media product ad.

Return STRICT JSON only:
{"headline": "...", "subhead": "...", "cta": "...", "color": "..."}

Rules:
- headline: 2 to 5 words, punchy, scroll-stopping. Title case or UPPERCASE feel. No period.
- subhead: 3 to 8 words, supports the headline.
- cta: 1 to 3 words button text (e.g. "Shop Now", "Discover", "Order Today").
- color: pick ONE of: ${COLOR_COMBO_IDS.join(", ")} — choose what best fits the product/brand mood.
- Plain, confident English. No emojis. No hashtags. No quotes inside values.`;

// ─── Stratège self-marketing copy (Lock 3 + Lock 4) ─────────────────────────
const STRATEGE_COPY_SYSTEM = `You write the on-image text for a Stratège self-marketing ad.

Return STRICT JSON only:
{"headline": "...", "subhead": "...", "cta": "..."}

${STRATEGE_HEADLINE_GUIDE}

${STRATEGE_SUBHEAD_GUIDE}

${STRATEGE_CTA_GUIDE}

Lengths & form:
- headline: 2 to 7 words. Founder voice — a question, a truth, or a specific moment. Not ALL CAPS marketing.
- subhead: 4 to 10 words, a concrete moment, not a claim.
- No emojis, no hashtags, no quotes inside values.`;

// Generates Stratège copy and validates it against the banned patterns,
// regenerating up to 3 times. Curated on-brand fallbacks if it never passes.
async function writeStrategeCopy(args: {
  product: string;
  brand: Record<string, unknown>;
}): Promise<AdCopy & { suggestedColor?: ColorCombo }> {
  const seed = String(args.brand.brand_name ?? args.product ?? "stratege");
  const h = smallHash(seed);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await chat({
        model: "haiku",
        system: STRATEGE_COPY_SYSTEM,
        temperature: 0.9 + attempt * 0.05,
        maxTokens: 200,
        messages: [
          {
            role: "user",
            content: `Write a fresh Stratège ad: headline, subhead, CTA.${
              attempt
                ? " Your previous attempt sounded too generic/corporate — pick a more specific founder moment, question, or feeling."
                : ""
            }\n\nReturn the JSON.`,
          },
        ],
      });
      const s = r.text.indexOf("{");
      const e = r.text.lastIndexOf("}");
      if (s === -1 || e === -1) continue;
      const obj = JSON.parse(r.text.slice(s, e + 1));
      const headline = cleanStr(obj.headline, 60);
      const subhead = cleanStr(obj.subhead, 90);
      let cta = cleanStr(obj.cta, 24);

      if (isBannedHeadline(headline)) continue; // regenerate
      if (isBannedCta(cta)) cta = strategeCtaFallback(h + attempt);
      return {
        headline,
        subhead: subhead || strategeSubheadFallback(h),
        cta,
      };
    } catch {
      continue;
    }
  }

  // Never passed — use curated, always-on-brand copy.
  return {
    headline: strategeHeadlineFallback(h),
    subhead: strategeSubheadFallback(h),
    cta: strategeCtaFallback(h),
  };
}

export async function writeAdCopy(args: {
  product: string;
  description?: string;
  brand: Record<string, unknown>;
}): Promise<AdCopy & { suggestedColor?: ColorCombo }> {
  const { product, description, brand } = args;

  // Stratège marketing itself → locked voice + validation.
  if (isStrategeBrand(brand)) return writeStrategeCopy({ product, brand });
  const ctx = [
    brand.brand_name && `Brand: ${brand.brand_name}`,
    brand.product && `Product line: ${brand.product}`,
    brand.target_audience && `Audience: ${brand.target_audience}`,
    brand.usp && `USP: ${brand.usp}`,
    brand.content_style && `Tone: ${brand.content_style}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await chat({
      model: "haiku",
      system: COPY_SYSTEM,
      temperature: 0.85,
      maxTokens: 200,
      messages: [
        {
          role: "user",
          content: `Product: ${product}
${description ? `Product details: ${description}\n` : ""}Startup:
${ctx || "(not set)"}

Return the JSON.`,
        },
      ],
    });
    const s = r.text.indexOf("{");
    const e = r.text.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    const obj = JSON.parse(r.text.slice(s, e + 1));
    const clean = (v: unknown, max: number) =>
      String(v ?? "").trim().replace(/^["']|["']$/g, "").slice(0, max);
    const headline = clean(obj.headline, 60);
    if (!headline) throw new Error("no headline");
    const suggested = COLOR_COMBO_IDS.includes(obj.color)
      ? (obj.color as ColorCombo)
      : undefined;
    return {
      headline,
      subhead: clean(obj.subhead, 90),
      cta: clean(obj.cta, 24) || "Shop Now",
      suggestedColor: suggested,
    };
  } catch {
    return fallbackCopy(product);
  }
}

function fallbackCopy(product: string): AdCopy {
  const name = product.trim() || "Our Product";
  return {
    headline: "New Arrival",
    subhead: `Meet the ${name}`.slice(0, 90),
    cta: "Shop Now",
  };
}

// Patch existing copy from a natural-language edit instruction
// ("change the headline to X", "make it say 40% off", "shorter CTA").
const EDIT_SYSTEM = `You edit the text fields of a product ad based on a user instruction.

You are given the current JSON and an instruction. Return the FULL updated JSON only:
{"headline": "...", "subhead": "...", "cta": "..."}

Rules:
- Change ONLY what the instruction asks; keep the other fields as they were.
- Keep lengths tight: headline 2-5 words, subhead 3-8 words, cta 1-3 words.
- No quotes inside values, no emojis, no hashtags.`;

export async function editAdCopy(
  current: AdCopy,
  instruction: string
): Promise<AdCopy> {
  try {
    const r = await chat({
      model: "haiku",
      system: EDIT_SYSTEM,
      temperature: 0.4,
      maxTokens: 200,
      messages: [
        {
          role: "user",
          content: `Current: ${JSON.stringify(current)}
Instruction: ${instruction}

Return the updated JSON.`,
        },
      ],
    });
    const s = r.text.indexOf("{");
    const e = r.text.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    const obj = JSON.parse(r.text.slice(s, e + 1));
    const clean = (v: unknown, max: number, fb: string) => {
      const out = String(v ?? "").trim().replace(/^["']|["']$/g, "").slice(0, max);
      return out || fb;
    };
    return {
      headline: clean(obj.headline, 60, current.headline),
      subhead: clean(obj.subhead, 90, current.subhead),
      cta: clean(obj.cta, 24, current.cta),
    };
  } catch {
    return current;
  }
}
