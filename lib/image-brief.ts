import { chat } from "./claude";

// Creative brief state machine.
// The image pipeline now runs:
//   intent → inferBrief (auto-fills what we can) → ask only what's missing
//   (template, hook, color) → buildIdeogramPrompt → Ideogram → overlay.
// Each template maps to ONE forced overlay layout, so a "Founder Story"
// never renders with the same composition as a "Product Launch".

export type Template =
  | "product_launch"
  | "feature_update"
  | "founder_story"
  | "educational"
  | "testimonial"
  | "problem_solution"
  | "announcement"
  | "milestone";

export type ColorMode = "brand" | "brand_plus_accent" | "custom";

export type BriefField = "template" | "hook" | "color";

export interface ImageBrief {
  request: string;
  template?: Template;
  hook?: string;
  hookOptions?: string[];
  color?: ColorMode;
}

export interface BriefActions {
  field: BriefField;
  intro: string;
  options: {
    label: string;
    value: string;
    isHookText?: boolean;
    description?: string;
    preview?: "productHero" | "editorial" | "frame" | "fullbleed" | "split" | "banner" | "poster";
  }[];
  resolvedValue?: string;
}

export const TEMPLATE_LABELS: Record<Template, string> = {
  product_launch: "Product Launch",
  feature_update: "Feature Update",
  founder_story: "Founder Story",
  educational: "Educational Post",
  testimonial: "Testimonial",
  problem_solution: "Problem → Solution",
  announcement: "Announcement",
  milestone: "Growth Milestone",
};

export const COLOR_LABELS: Record<ColorMode, string> = {
  brand: "Use Brand Colors",
  brand_plus_accent: "Brand + Accent",
  custom: "Custom Colors",
};

export const TEMPLATE_DESCRIPTIONS: Record<Template, string> = {
  product_launch: "Headline top, one product visual below, CTA under the hook.",
  feature_update: "Editorial card with product/feature visual and calm spacing.",
  founder_story: "Large founder/workspace visual with a refined bottom headline.",
  educational: "Text-first teaching layout with a simple supporting visual.",
  testimonial: "Full image background with bold readable text at the bottom.",
  problem_solution: "Strong top headline band with the visual story below.",
  announcement: "Bold poster style with one iconic subject and big headline.",
  milestone: "Celebration poster with big headline and one clear focal point.",
};

// Map brief templates → existing overlay template names (lib/overlay.ts).
import type { TemplateName } from "./overlay";
export const TEMPLATE_TO_OVERLAY: Record<Template, TemplateName> = {
  product_launch: "productHero",
  feature_update: "editorial",
  founder_story: "frame",
  educational: "editorial",
  testimonial: "fullbleed",
  problem_solution: "banner",
  announcement: "poster",
  milestone: "poster",
};

// Default CTAs per template — deliberately varied so we never default to
// "Get Started" on every image.
export const TEMPLATE_DEFAULT_CTA: Record<Template, string> = {
  product_launch: "Try It Now",
  feature_update: "See What's New",
  founder_story: "Read More",
  educational: "Save This",
  testimonial: "Join Them",
  problem_solution: "Get The Fix",
  announcement: "Learn More",
  milestone: "Thank You",
};

// What Ideogram should actually depict per template (drives the SUBJECT line
// of the prompt — different templates produce different imagery, not just
// different layouts).
export const TEMPLATE_SUBJECT: Record<Template, string> = {
  product_launch:
    "one clean product hero visual only: a single device, product object, abstract SaaS system, or premium product scene. If a screen appears it must be blank or contain abstract UI blocks only, with zero readable text",
  feature_update:
    "product UI close-up — a device or interface fragment hinting at the new feature, modern SaaS visual",
  founder_story:
    "human portrait or workspace moment, personal and editorial, warm light, magazine-cover energy",
  educational:
    "clear diagrammatic visual — illustrative or 3D objects representing the concept, calm and instructive",
  testimonial:
    "lifestyle shot of a customer archetype actually using the product, real-feeling photography",
  problem_solution:
    "before/after split or contrast composition visualising chaos → calm, two halves of one story",
  announcement:
    "bold poster composition with one iconic object or symbol, high contrast, attention-grabbing",
  milestone:
    "celebratory but premium scene — number/milestone focal point with crowd or product context",
};

// Layout directive per template — fed straight into the Ideogram prompt so
// the generated image already anticipates the overlay layout.
export const TEMPLATE_LAYOUT_DIRECTIVE: Record<Template, string> = {
  product_launch:
    "Layout: create a single calm hero subject in the lower or middle area, with clean negative space around it. Do not create a split-screen poster. Do not create an ad layout. Our code will add the headline and CTA later.",
  feature_update:
    "Layout: a single rounded image card with generous breathing room above and below for editorial-style headline text. Notion-like calm spacing.",
  founder_story:
    "Layout: the subject is the centerpiece, framed inside the canvas with room around it. Lower band kept simple for a refined headline. Cinematic.",
  educational:
    "Layout: subject is a clear illustrative/diagrammatic object, generous negative space around it for a centered headline. No clutter.",
  testimonial:
    "Layout: full-bleed scene, darker zone at the bottom for an UPPERCASE headline overlay. Magazine-cover energy.",
  problem_solution:
    "Layout: composition leaves the TOP third visually calm for a colored headline band, full image fills the lower two-thirds. Corporate-clean rhythm.",
  announcement:
    "Layout: bold poster — single iconic subject placed mid-low; the top half is calm so a large UPPERCASE headline can dominate. Solid-color field welcome.",
  milestone:
    "Layout: single celebratory subject placed in the lower portion; top half kept calm for a large milestone headline. Solid-color field welcome.",
};

export function nextQuestion(brief: ImageBrief): BriefField | null {
  if (!brief.template) return "template";
  if (!brief.color) return "color";
  if (!brief.hook) return "hook";
  return null;
}

// ─── inference ────────────────────────────────────────────────────────────

const TEMPLATE_KEYWORDS: [Template, RegExp][] = [
  ["product_launch", /\b(product launch|launching (?:our|a) (?:new )?product|new product (?:launch|reveal)|product reveal|launch announcement)\b/i],
  ["feature_update", /\b(feature update|new feature|just shipped|feature launch|release notes|product update)\b/i],
  ["founder_story", /\b(founder story|my (?:story|journey)|founder (?:note|journey)|behind the scenes|personal note)\b/i],
  ["educational", /\b(educational|how[- ]to|tutorial|tip(?:s)?|guide|teach|explain|lesson)\b/i],
  ["testimonial", /\b(testimonial|customer (?:story|quote)|case study|love note|user quote|review post)\b/i],
  ["problem_solution", /\b(problem.{0,20}solution|before.{0,10}after|pain point|tired of|stop (?:wasting|losing))\b/i],
  ["announcement", /\b(announcement|big news|we[' ]?re (?:launching|hiring)|major news|we[' ]?re announcing)\b/i],
  ["milestone", /\b(milestone|reached \d|hit \d|(?:10k|100k|1m|10m)|anniversary|years? in|customers? celebrate)\b/i],
];

const COLOR_KEYWORDS: [ColorMode, RegExp][] = [
  ["brand_plus_accent", /\b(brand\s*(?:colors?|palette)\s*(?:\+|and|with)\s*accent|with (?:an )?accent color)\b/i],
  ["custom", /\b(custom colors?|specific colors?|use #[0-9a-f]{3,6})\b/i],
  ["brand", /\b(use (?:my|our) brand colors?|brand colors?|our colors?|brand palette)\b/i],
];

const HOOK_LABELED = /(?:hook|headline|tagline)\s*[:=]\s*["'“‘]?([^"'”’\n]{3,140})["'”’]?/i;
const HOOK_QUOTED = /["“]([^"”]{4,140})["”]/;

export async function inferBrief(
  request: string
): Promise<ImageBrief> {
  const brief: ImageBrief = { request };

  for (const [t, rx] of TEMPLATE_KEYWORDS) {
    if (rx.test(request)) {
      brief.template = t;
      break;
    }
  }

  for (const [c, rx] of COLOR_KEYWORDS) {
    if (rx.test(request)) {
      brief.color = c;
      break;
    }
  }

  const h = request.match(HOOK_LABELED);
  if (h) {
    brief.hook = h[1].trim().replace(/[.\s]+$/, "");
  } else {
    const q = request.match(HOOK_QUOTED);
    if (q) brief.hook = q[1].trim();
  }

  return brief;
}

// ─── hook generation ──────────────────────────────────────────────────────

const HOOK_SYSTEM = `You write 5 short, punchy social-media HOOKS for a startup's marketing image.

Return STRICT JSON only:
{"hooks": ["...", "...", "...", "...", "..."]}

Rules:
- Each hook 4 to 12 words. Sentence case or lower case. Never SHOUTING.
- Five DISTINCT angles — do not write 5 variations of the same idea.
- Tailor each hook to the template intent. For example:
  • product_launch → bold reveal: "We finally built X for Y"
  • feature_update → "Now you can …" / "We just shipped X"
  • founder_story → personal, first-person
  • educational → "the 3 things …" / "stop doing X"
  • testimonial → a quoted user voice
  • problem_solution → pain → relief
  • announcement → news-headline style
  • milestone → gratitude + a specific number
- A hook is a HEADLINE, not a CTA. Never write "Get Started", "Click here", "Sign up now", "Buy now".`;

export async function generateHooks(
  request: string,
  brand: Record<string, unknown>,
  template: Template
): Promise<string[]> {
  const ctx = [
    brand.brand_name && `Brand: ${brand.brand_name}`,
    brand.product && `Product: ${brand.product}`,
    brand.target_audience && `Audience: ${brand.target_audience}`,
    brand.usp && `USP: ${brand.usp}`,
    brand.content_style && `Tone: ${brand.content_style}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await chat({
      model: "haiku",
      system: HOOK_SYSTEM,
      temperature: 0.85,
      maxTokens: 350,
      messages: [
        {
          role: "user",
          content: `Template: ${template}
Startup:
${ctx || "(not set)"}
User request: ${request}

Return the JSON.`,
        },
      ],
    });
    const s = r.text.indexOf("{");
    const e = r.text.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    const obj = JSON.parse(r.text.slice(s, e + 1));
    const hooks: string[] = Array.isArray(obj.hooks)
      ? obj.hooks
          .map((x: unknown) => String(x).trim().replace(/^["']|["']$/g, ""))
          .filter((s: string) => s.length >= 3 && s.length <= 160)
      : [];
    if (hooks.length >= 3) return hooks.slice(0, 5);
    throw new Error("not enough hooks");
  } catch {
    return fallbackHooks(template);
  }
}

// ─── caption generation ───────────────────────────────────────────────────

const CAPTION_SYSTEM = `You write ONE ready-to-post social-media caption for a startup's marketing image.

Return STRICT JSON only:
{"caption": "..."}

Rules:
- 2 to 4 short sentences, warm and human — not corporate.
- Open with a scroll-stopping line that echoes the image's hook.
- Add one line of value/context, then a soft call-to-action.
- End with 3 to 6 relevant hashtags on the same line.
- Use at most one emoji. India-first audience; plain, friendly English.
- Do NOT wrap in quotes or markdown.`;

export async function generateCaption(
  request: string,
  brand: Record<string, unknown>,
  brief: ImageBrief
): Promise<string | null> {
  const ctx = [
    brand.brand_name && `Brand: ${brand.brand_name}`,
    brand.product && `Product: ${brand.product}`,
    brand.target_audience && `Audience: ${brand.target_audience}`,
    brand.usp && `USP: ${brand.usp}`,
    brand.content_style && `Tone: ${brand.content_style}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await chat({
      model: "haiku",
      system: CAPTION_SYSTEM,
      temperature: 0.8,
      maxTokens: 300,
      messages: [
        {
          role: "user",
          content: `Template: ${brief.template ?? "general"}
Headline on the image: ${brief.hook ?? "(none)"}
Startup:
${ctx || "(not set)"}
User request: ${request}

Return the JSON.`,
        },
      ],
    });
    const s = r.text.indexOf("{");
    const e = r.text.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    const obj = JSON.parse(r.text.slice(s, e + 1));
    const caption = typeof obj.caption === "string" ? obj.caption.trim() : "";
    return caption.length >= 10 ? caption : null;
  } catch {
    return null;
  }
}

function fallbackHooks(template: Template): string[] {
  const banks: Record<Template, string[]> = {
    product_launch: [
      "We finally built the thing",
      "Meet what we've been making",
      "The product we wished existed",
      "Built for founders who actually ship",
      "This is what we couldn't stop building",
    ],
    feature_update: [
      "Now you can do this in one click",
      "We just shipped something small but mighty",
      "A tiny update that changes everything",
      "You asked, we built",
      "The smallest fix with the biggest impact",
    ],
    founder_story: [
      "I almost gave up last month",
      "What I learned building this",
      "Year one as a founder, honestly",
      "The thing nobody tells you about shipping",
      "Behind every product is a stubborn person",
    ],
    educational: [
      "The 3 things I wish I knew sooner",
      "Stop doing this with your marketing",
      "A simple framework that actually works",
      "Read this before your next launch",
      "Most founders get this one thing wrong",
    ],
    testimonial: [
      "\"It just works\"",
      "\"I wish I had this two years ago\"",
      "\"Saved my team hours every week\"",
      "\"The thing we couldn't live without\"",
      "\"Finally, a tool that doesn't get in the way\"",
    ],
    problem_solution: [
      "Stop wasting hours on the wrong thing",
      "From chaos to clarity, fast",
      "The fix you didn't know existed",
      "We solved the problem nobody wanted to talk about",
      "Less time fighting tools, more time shipping",
    ],
    announcement: [
      "Big news — we're going public",
      "We're partnering with the team we've always admired",
      "A new chapter starts today",
      "We've been quietly working on something",
      "Today, everything changes a little",
    ],
    milestone: [
      "10,000 founders, thank you",
      "One year in, here's what's next",
      "Our first 1,000 customers said yes",
      "A small team, a big number",
      "We hit the milestone we set in week one",
    ],
  };
  return banks[template];
}
