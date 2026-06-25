// ─────────────────────────────────────────────────────────────────────────────
// STRATÈGE BRAND LOCKS — single source of truth.
//
// These constraints apply ONLY when Stratège generates ads for *itself*
// (self-marketing). A normal user's brand is never subject to them — they keep
// their own colors, voice, and CTAs. The goal: Stratège's own ads should look
// like Stratège (warm cream + dark green, editorial, founder-personal), never
// like a generic purple-gradient SaaS tool.
// ─────────────────────────────────────────────────────────────────────────────

// LOCK 1 — Brand color enforcement. Three approved palettes, weighted.
export interface StrategePalette {
  name: string;
  bg: string;
  accent: string;
  text: string;
  weight: number; // rotation weight (must sum to 100)
}

export const STRATEGE_PALETTES: StrategePalette[] = [
  { name: "cream", bg: "#F5F1EA", accent: "#1D9E75", text: "#1A1A1A", weight: 60 },
  { name: "green", bg: "#1D9E75", accent: "#F5F1EA", text: "#FFFFFF", weight: 25 },
  { name: "noir", bg: "#0A0C0F", accent: "#5DCAA5", text: "#F0F0F0", weight: 15 },
];

// Weighted pick from a stable hash (0..n). 60% cream / 25% green / 15% noir.
export function pickStrategePalette(h: number): StrategePalette {
  const pct = h % 100;
  let acc = 0;
  for (const p of STRATEGE_PALETTES) {
    acc += p.weight;
    if (pct < acc) return p;
  }
  return STRATEGE_PALETTES[0];
}

export const BANNED_COLORS = [
  "purple",
  "violet",
  "indigo",
  "neon colors",
  "bright blue gradients",
  "rainbow gradients",
  "SaaS purple-to-pink gradients",
];

// LOCK 2 + LOCK 6 — Approved hero treatments / specific moments. Each one is a
// concrete scene, never an abstract concept. Pick ONE per ad (rotate by seed).
export const HERO_TREATMENTS = [
  "A warm desk scene: an open laptop, a notebook, and a cup of coffee in soft natural daylight",
  "A typographic poster where the bold serif headline IS the hero — no graphics, generous negative space",
  "An editorial photograph of a founder at work, a candid story-first moment, magazine-style framing",
  "A recognizable fragment of the Stratège chat interface shown in context on a laptop screen",
  "A physical, hand-made element — a sticky note, a journal page, or a pinned-up index card, warm and tactile, not digital",
  "A founder at their desk just after shipping: laptop open, coffee nearby, the Stratège interface visible on screen",
  "A social post draft on screen going from blank to filled — a clear before/after moment",
  "A hand-written sticky note pinned to a desk with a post idea scribbled on it",
  "A close-up of a founder's hands typing on a keyboard — tactile, intimate, real",
  "A printed-out social post that Stratège generated, pinned to a corkboard — physical and real",
];

export function pickHeroTreatment(h: number): string {
  return HERO_TREATMENTS[h % HERO_TREATMENTS.length];
}

// Things that must NEVER appear in a Stratège ad (Lock 2 + Lock 6 bans).
export const NEGATIVE_VISUALS = [
  "fake dashboards",
  "chart mockups",
  "bar graphs or line graphs",
  "pie charts or circular metric rings",
  "generic UI fragments",
  "abstract data visualizations",
  "floating cards with fake numbers",
  "analytics interfaces",
  "robot or AI imagery",
  "brain illustrations",
  "lightbulb 'idea' icons",
  "speed lines, lightning bolts, or rockets",
  "generic productivity stock concepts",
  "any decorative graphic that resembles a chart or dashboard",
];

export const STRATEGE_NEGATIVE_PROMPT = NEGATIVE_VISUALS.join(", ");

// LOCK 5 — Visual hierarchy / composition rules (injected verbatim).
export const COMPOSITION_RULES =
  "Composition rules — strict: " +
  "1) ONE dominant focal point — either the headline OR the hero visual is primary, not both equally. " +
  "2) ONE supporting element that reinforces it, not three competing ones. " +
  "3) Negative space takes at least 40% of the frame; do not fill it with elements. " +
  "4) The CTA button is solid-filled, high-contrast, with generous padding and a tall, tappable size. " +
  "5) The logo sits small (about 8% of width) at the bottom-left or bottom-right — present but not dominant. " +
  "6) Every element must relate to the message — no floating decorative graphics.";

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
