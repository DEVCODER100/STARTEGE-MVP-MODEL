// ─────────────────────────────────────────────────────────────────────────────
// ResolvedBrief — the single structured input contract for the image engine.
// (Named ResolvedBrief because lib/ad-brief.ts already exports the older chat
// AdBrief type.) Every generation request resolves to this BEFORE any prompt is
// built. Produced by lib/brief-interpreter.ts; consumed by the studio route +
// lib/ad-imagegen.ts. Pure types/constants — no imports, safe for client use.
// ─────────────────────────────────────────────────────────────────────────────

export type ImageRole = "product_photo" | "screenshot" | "logo" | "reference_style";

export type Mood = "energetic" | "premium" | "minimal" | "warm" | "bold";

export type Platform =
  | "instagram_post"
  | "instagram_story"
  | "linkedin"
  | "twitter"
  | "facebook";

// Display-typography layout. Draw-geometry for each lives in the SSOT
// lib/layout-archetypes.ts; this union stays here because it is client-safe.
export type Archetype =
  | "HERO_TYPE" // full-width uppercase display headline (the "UNLEASH" look)
  | "HERO_LEFT" // stacked left-aligned headline (the classic split)
  | "BANNER_BOTTOM" // background dominant, text band at the bottom third
  | "SPLIT_DIAGONAL" // headline in the calmer half of a diagonal split
  | "TEXT_HEAVY"; // headline + subhead + checklist + price for benefit-rich briefs

export interface BriefImage {
  id: string; // the stored URL (blob) doubles as the id
  role: ImageRole;
}

export interface ResolvedBrief {
  brand: {
    name: string;
    palette: string[]; // hexes from brand settings or user choice
    isStratege: boolean; // triggers brand locks
  };
  product: {
    source: "uploaded" | "named" | "none";
    name?: string; // only if named
    imageId?: string; // only if uploaded (url of the product_photo image)
  };
  uploadedImages: BriefImage[];
  copy: {
    headline: string;
    subhead?: string;
    benefits?: string[]; // max 3; ✓ characters stripped
    cta: string;
    price?: string;
    discount?: string;
  };
  mood: Mood;
  platform: Platform;
  aspectRatio: string; // derived from platform (render is 1:1 for now — flagged)
  archetype: Archetype; // display-typography layout (see lib/layout-archetypes)
  assumptions: string[]; // everything the interpreter filled in / guessed
}

export const IMAGE_ROLES: ImageRole[] = [
  "product_photo",
  "screenshot",
  "logo",
  "reference_style",
];

export const IMAGE_ROLE_LABELS: Record<ImageRole, string> = {
  product_photo: "Product photo",
  screenshot: "App screenshot",
  logo: "Logo",
  reference_style: "Style reference",
};

export const MOODS: Mood[] = ["energetic", "premium", "minimal", "warm", "bold"];

export const ARCHETYPES: Archetype[] = [
  "HERO_TYPE",
  "HERO_LEFT",
  "BANNER_BOTTOM",
  "SPLIT_DIAGONAL",
  "TEXT_HEAVY",
];

// Human labels for the confirmation card ("use the big headline style").
export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  HERO_TYPE: "Big headline",
  HERO_LEFT: "Classic left",
  BANNER_BOTTOM: "Bottom banner",
  SPLIT_DIAGONAL: "Diagonal split",
  TEXT_HEAVY: "Detail-rich",
};

export function isArchetype(v: unknown): v is Archetype {
  return typeof v === "string" && (ARCHETYPES as string[]).includes(v);
}

export const PLATFORM_ASPECT: Record<Platform, string> = {
  instagram_post: "1:1",
  instagram_story: "9:16",
  linkedin: "1.91:1",
  twitter: "16:9",
  facebook: "1:1",
};

export function isImageRole(v: unknown): v is ImageRole {
  return typeof v === "string" && (IMAGE_ROLES as string[]).includes(v);
}
export function isMood(v: unknown): v is Mood {
  return typeof v === "string" && (MOODS as string[]).includes(v);
}
export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && Object.keys(PLATFORM_ASPECT).includes(v);
}

// Bug-A rule: benefit strings must not carry their own checkmarks — the
// template's icon is the only check.
export function stripChecks(s: string): string {
  return s.replace(/[✓✔☑✅]/g, "").trim();
}

// One compact human sentence for the confirmation moment.
export function briefSummary(b: ResolvedBrief): string {
  const prod =
    b.product.source === "uploaded"
      ? "your uploaded product as the hero"
      : b.product.source === "named"
      ? `“${b.product.name}” as the hero`
      : "no product shown — abstract background";
  const platform = b.platform.replace("_", " ");
  return `Ad for ${b.brand.name} · ${prod} · ${b.mood} mood · ${ARCHETYPE_LABELS[b.archetype]} layout · ${platform}`;
}
