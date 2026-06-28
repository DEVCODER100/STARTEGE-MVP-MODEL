// ─────────────────────────────────────────────────────────────────────────────
// STRATÈGE BRAND LOCKS — single source of truth.
//
// These constraints apply ONLY when Stratège generates ads for *itself*
// (self-marketing). A normal user's brand is never subject to them — they keep
// their own colors, voice, and CTAs. The goal: Stratège's own ads should look
// like Stratège (warm cream + dark green, editorial, founder-personal), never
// like a generic purple-gradient SaaS tool.
// ─────────────────────────────────────────────────────────────────────────────

// LOCK 1 + visual rules — palettes, hero scenes, and the shared composition /
// negative / banned-color rules now live in ./prompt-constants (single source of
// truth across all five templates). Re-exported here for back-compat.
export {
  BRAND_PALETTES,
  STRATEGE_PALETTES,
  pickStrategePalette,
  HERO_TREATMENTS,
  pickHeroTreatment,
  NO_FAKE_UI,
  BANNED_COLORS,
  COMPOSITION_RULES,
  SAFE_ZONE_RULE,
  type BrandPalette,
  type StrategePalette,
} from "./prompt-constants";

// LOCK 3 — Headline voice guardrails.
export const STRATEGE_HEADLINE_GUIDE = `You are writing headlines for Stratège, a content thinking partner for founders.

NEVER use these generic patterns (they sound like every other AI marketing tool):
- "Strategy Made [adjective]" (e.g. "Strategy Made Simple")
- "Ads/Creative/Content in Minutes Not Days"
- "Strategy Meets [noun]"
- "AI [function] Co-Pilot"
- "Create Stunning [noun]"
- "Save Time, [verb]"
- "Effortless / Supercharge / Unlock / 10x / Made Easy"
- Anything that could fit AdCreative.ai or Canva.

INSTEAD use the Stratège voice — a founder talking to another founder:
- Direct questions: "What did you ship today?"
- Founder truths: "Your business already has stories."
- Specific moments: "The desk is open."
- Anti-patterns: "Stop overthinking what to post."
- Real states: "Built today. Posted by 3pm."
- Founder relief: "Marketing without the tax."

The headline must be specific to a moment, a question, or a feeling founders actually have. Never corporate. Never claim-driven. Never "we help you do X". The test: would another founder read it and think "yes, that's me"? If it sounds like marketing copy, it fails.`;

// LOCK 4 — Subhead + CTA guidance.
export const STRATEGE_SUBHEAD_GUIDE = `The subhead describes a specific moment or outcome, never a vague claim. Good examples:
- "Tell it what you shipped — get a post in your voice."
- "Built for founders who hate the marketing tax."
- "Stop staring at the blank Twitter draft."
- "Three angles. Your voice. Done in five minutes."
- "Where what you built becomes what you post."`;

export const STRATEGE_CTA_GUIDE = `The CTA must be Stratège-specific, never generic. Use one of:
"Open the desk", "Try it free", "Show me", "Start writing", "See it work".
NEVER use: "Get Started", "Start Now", "Start Free", "Discover", "Learn More", "Sign Up", "Click Here", "Try Now".`;

// Validation — banned headline patterns (Lock 3).
export const BANNED_HEADLINE_PATTERNS: RegExp[] = [
  /strategy made \w+/i,
  /\b(ads?|creative|content|posts?)\b[^.]*\bin minutes\b[^.]*\bnot days\b/i,
  /in minutes,?\s*not days/i,
  /strategy meets \w+/i,
  /\bco-?pilot\b/i,
  /create stunning/i,
  /save time/i,
  /\beffortless\w*/i,
  /\bmade (simple|easy)\b/i,
  /\bunlock your\b/i,
  /\bsupercharge\b/i,
  /\b10x\b/i,
  /\bstunning\b/i,
];

export function isBannedHeadline(h: string): boolean {
  const s = (h || "").trim();
  if (!s) return true;
  return BANNED_HEADLINE_PATTERNS.some((re) => re.test(s));
}

export const BANNED_CTAS = [
  "get started",
  "start now",
  "start free",
  "discover",
  "learn more",
  "sign up",
  "click here",
  "try now",
  "shop now",
  "order today",
];

export function isBannedCta(c: string): boolean {
  const s = (c || "").trim().toLowerCase();
  if (!s) return true;
  return BANNED_CTAS.includes(s);
}

// Curated fallbacks (always on-brand) when the model keeps producing banned copy.
export const STRATEGE_HEADLINES = [
  "What did you ship today?",
  "The desk is open.",
  "Your business already has stories.",
  "Stop overthinking what to post.",
  "Built today. Posted by 3pm.",
  "Marketing without the tax.",
];
export const STRATEGE_SUBHEADS = [
  "Tell it what you shipped — get a post in your voice.",
  "Built for founders who hate the marketing tax.",
  "Stop staring at the blank Twitter draft.",
  "Three angles. Your voice. Done in five minutes.",
  "Where what you built becomes what you post.",
];
export const STRATEGE_CTAS = [
  "Open the desk",
  "Try it free",
  "Show me",
  "Start writing",
  "See it work",
];

export function strategeHeadlineFallback(h: number): string {
  return STRATEGE_HEADLINES[h % STRATEGE_HEADLINES.length];
}
export function strategeSubheadFallback(h: number): string {
  return STRATEGE_SUBHEADS[h % STRATEGE_SUBHEADS.length];
}
export function strategeCtaFallback(h: number): string {
  return STRATEGE_CTAS[h % STRATEGE_CTAS.length];
}

// Detection — is this generation Stratège marketing itself?
// Matches brand name "Stratège"/"Stratege" (diacritic-insensitive) or an
// explicit self-marketing flag on the brand/options object.
export function isStrategeBrand(brand: Record<string, unknown> | null | undefined): boolean {
  if (!brand) return false;
  if (brand.self_marketing === true || brand.selfMarketing === true) return true;
  const name = String(brand.brand_name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  return name === "stratege";
}
