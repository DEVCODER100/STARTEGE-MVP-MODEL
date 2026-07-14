import sharp from "sharp";
import { generateImages, remixImage, type IdeogramAspect } from "./ideogram";
import { loadImageBuffer, storeImage } from "./storage";
import {
  buildBackgroundPrompt,
  pickLever,
  resolveCombo,
} from "./ad-prompt-builder";
import { parseDescription } from "./ad-brief-parser";
import { mergeWithDefaults } from "./ad-brief-merger";
import { writeAdCopy, describeScreenshot } from "./ad-copy";
import { isStrategeBrand } from "./brand-locks";
import { pickStrategePalette, fnv1a } from "./prompt-constants";
import { compositeScreenshotInFrame, type FrameType } from "./device-frames";
import { drawSplitAdText } from "./text-overlay";
import { resolveArchetypeConfig, pickArchetype, isCopyHeavy, type Corner } from "./layout-archetypes";
import { logPromptConsole, logPromptFile } from "./prompt-log";
import type { AdBrief, AdCopy, AdLever, AdMode, ColorCombo } from "./ad-brief";
import { isMood, type Archetype, type Mood } from "./resolved-brief";

// Ad generation pipeline. Ideogram renders ONLY a text-free background (a hero
// scene / the product / a flat brand field); ALL ad text is drawn afterward by
// Sharp (lib/text-overlay.ts), so spelling is always correct and text always
// lands inside the safe zone. One text engine for every brand.
//   exact     → Ideogram v4 remix (keeps the real uploaded product), text-free
//   lookalike → Ideogram v4 generate the product, text-free
//   text      → Ideogram v4 generate from the typed product name, text-free

const REMIX_IMAGE_WEIGHT = 68; // 60-75: keep product recognisable, allow new bg+text

// Debug payload so we can see the exact prompt + decisions behind any image.
export interface AdDebug {
  prompt: string;
  parsedFields?: unknown;
  mergedFields?: unknown;
  levers: Record<string, unknown>;
}

export interface GeneratedAd {
  url: string;
  copy: AdCopy;
  mode: AdMode | "text";
  color: ColorCombo;
  lever: AdLever;
  archetype: Archetype;
  fallback: boolean;
  debug: AdDebug;
  state?: AdRenderState; // everything needed to re-edit this ad (Part C)
}

// Everything needed to RE-RENDER an ad without re-asking anything (Part C —
// conversational editing). Persisted per generation (chat_messages.image_meta).
//  • a text-side edit (copy / archetype / logo slot) re-runs Sharp over
//    `backgroundUrl` with NO Ideogram call and NO credit (same background pixels);
//  • a background-side edit (mood / product) regenerates the Ideogram bg (1 credit).
export interface AdRenderState {
  v: 3;
  backgroundUrl: string; // the pre-text background (Ideogram bg + composited product photo)
  brandLocked: boolean;
  palette: { bg: string; accent: string; text: string };
  textSide: "left" | "right";
  side: AdLever["side"];
  seed: string;
  render?: string;
  archetype: Archetype;
  aspectRatio?: string;
  mood?: string;
  copy: AdCopy;
  price?: string;
  discount?: string;
  logoUrl?: string;
  logoCorner?: Corner; // "move logo" edits override the archetype's default slot
  productPhotoUrl?: string; // uploaded hero (already baked into backgroundUrl)
  productName?: string; // named hero (for a background regen)
  // Set transiently when a background edit is proposed but awaiting confirmation.
  pendingEdit?: { changes: string[]; next: Partial<AdRenderState> } | null;
}

// The user's saved default logo (brand_profiles.logo_url) — applied when no
// logo was uploaded for this specific ad, so they upload once.
function defaultLogoUrl(brand: Record<string, unknown>): string | undefined {
  return typeof brand.logo_url === "string" && brand.logo_url ? brand.logo_url : undefined;
}

// Target canvas + nearest Ideogram aspect for a brief's aspect ratio (Part D).
// Ideogram renders the nearest supported ratio; Sharp cover-crops to the exact
// pixels, and the archetype's aspectOverrides re-anchor the text.
export type CanvasSpec = { w: number; h: number; ideogram: IdeogramAspect };
export function canvasFor(aspectRatio?: string): CanvasSpec {
  switch (aspectRatio) {
    case "4:5":
      return { w: 1080, h: 1350, ideogram: "ASPECT_4_5" };
    case "9:16":
      return { w: 1080, h: 1920, ideogram: "ASPECT_9_16" };
    case "1.91:1":
      return { w: 1200, h: 628, ideogram: "ASPECT_16_9" };
    case "16:9":
      return { w: 1200, h: 675, ideogram: "ASPECT_16_9" };
    default: // "1:1"
      return { w: 1080, h: 1080, ideogram: "ASPECT_1_1" };
  }
}

export async function generateAd(
  brand: Record<string, unknown>,
  brief: AdBrief,
  seed: string
): Promise<GeneratedAd> {
  if (!brief.copy) throw new Error("generateAd: brief.copy required");
  if (!brief.color) throw new Error("generateAd: brief.color required");

  const lever = brief.lever ?? pickLever(seed);
  const colors = resolveCombo(brief.color, brand);
  const isExact =
    brief.productSource === "upload" && brief.mode === "exact" && !!brief.photoUrl;
  const stratege = isStrategeBrand(brand);
  const palette = stratege
    ? pickStrategePalette(fnv1a(seed))
    : { bg: colors[0], accent: colors[1], text: "" };

  // Hero product ONLY when explicitly provided: exact photo → remix; lookalike
  // photo → its vision description; text → the product the user named. Never the
  // stored brand.product (that's a category → would hallucinate a hero).
  const heroSubject = isExact
    ? undefined
    : brief.productDescription?.trim() || brief.productName?.trim() || undefined;

  const r = await renderFullCanvasAd({
    copy: brief.copy,
    seed,
    side: lever.side,
    brandLocked: stratege,
    palette,
    product: heroSubject,
    render: lever.render,
    photoUrl: isExact ? brief.photoUrl : undefined,
    logoUrl: defaultLogoUrl(brand),
  });

  return {
    url: r.url,
    copy: brief.copy,
    mode: brief.mode ?? "text",
    color: brief.color,
    lever,
    archetype: r.archetype,
    fallback: r.fallback,
    state: r.state,
    debug: {
      prompt: r.prompt,
      levers: {
        stratege,
        deterministicText: true,
        colors: stratege ? "brand-locked" : colors,
        side: lever.side,
        render: lever.render,
        archetype: r.archetype,
      },
    },
  };
}

// ─── Dual-input "Describe" flow ─────────────────────────────────────────────
// The Image Studio textarea is the source of truth: parse it → fill nulls with
// smart defaults from the brand → auto-write copy → build the prompt → render.
export interface DescribeOptions {
  description: string; // final textarea content (palettes/styles/chips + free text)
  photoUrl?: string; // optional uploaded product photo
  mode?: AdMode; // exact | lookalike (only meaningful with a photo)
  productDescription?: string; // optional vision description for lookalike
  // ── ResolvedBrief overrides (the interpretation layer, when present) ──
  brief?: {
    productSource?: "uploaded" | "named" | "none";
    productName?: string;
    productPhotoUrl?: string; // role=product_photo → Sharp-composited hero
    logoUrl?: string; // role=logo → Sharp places it, never sent to Ideogram
    mood?: string;
    archetype?: Archetype; // chosen display-typography layout (else auto-picked)
    aspectRatio?: string; // Part D
    copy?: Partial<AdCopy>;
    price?: string;
    discount?: string;
  };
}

export async function generateFromDescription(
  brand: Record<string, unknown>,
  opts: DescribeOptions,
  seed: string
): Promise<GeneratedAd> {
  const parsed = await parseDescription(opts.description);
  const merged = mergeWithDefaults(parsed, brand, seed);
  const brief = opts.brief;

  const product = String(brand.product ?? "the product").slice(0, 120);
  // Copy: the interpreted brief wins; otherwise auto-write.
  let copy: AdCopy;
  if (brief?.copy?.headline && brief.copy.cta) {
    copy = {
      headline: brief.copy.headline,
      subhead: brief.copy.subhead ?? "",
      cta: brief.copy.cta,
      bullets: brief.copy.bullets,
    };
  } else {
    const written = await writeAdCopy({ product, description: opts.description, brand });
    copy = {
      headline: merged.headline_text || written.headline,
      subhead: written.subhead,
      cta: written.cta,
    };
  }

  const isExact = !!opts.photoUrl && opts.mode === "exact";
  const stratege = isStrategeBrand(brand);
  const palette = stratege
    ? pickStrategePalette(fnv1a(seed))
    : { bg: merged.colors[0], accent: merged.colors[1], text: "" };

  // Hero product ONLY when explicitly provided. Brief contract first:
  //   uploaded → Sharp composites the photo (abstract bg only, no hero prompt);
  //   named    → render exactly that; none → abstract, never invent.
  // Legacy (no brief): exact photo → remix; lookalike → vision description;
  // else the product NAMED in the description text. Never brand.product.
  let heroSubject: string | undefined;
  if (brief?.productSource === "none" || brief?.productSource === "uploaded") {
    heroSubject = undefined;
  } else if (brief?.productSource === "named") {
    heroSubject = brief.productName?.trim() || undefined;
  } else if (!isExact) {
    heroSubject = opts.productDescription?.trim() || parsed.product?.trim() || undefined;
  }

  const r = await renderFullCanvasAd({
    copy,
    seed,
    side: merged.side,
    brandLocked: stratege,
    palette,
    product: heroSubject,
    render: merged.render,
    photoUrl: isExact ? opts.photoUrl : undefined,
    mood: brief?.mood ?? merged.mood,
    productPhotoUrl: brief?.productPhotoUrl,
    logoUrl: brief?.logoUrl ?? defaultLogoUrl(brand),
    archetype: brief?.archetype,
    aspectRatio: brief?.aspectRatio,
    price: brief?.price,
    discount: brief?.discount,
  });

  return {
    url: r.url,
    copy,
    mode: opts.mode ?? "text",
    color: "brand",
    lever: pickLever(seed),
    archetype: r.archetype,
    fallback: r.fallback,
    state: r.state,
    debug: {
      prompt: r.prompt,
      parsedFields: parsed,
      mergedFields: stratege ? { ...merged, colors: "brand-locked" } : merged,
      levers: {
        stratege,
        deterministicText: true,
        colors: stratege ? "brand-locked" : merged.colors,
        side: merged.side,
        render: merged.render,
        mood: brief?.mood ?? merged.mood,
        archetype: r.archetype,
        briefProduct: brief?.productSource ?? "(legacy)",
      },
    },
  };
}

// ─── Screenshot / SaaS ad (Problem 2) ───────────────────────────────────────
// The real screenshot stays pixel-perfect: Ideogram makes only the background +
// text (mockup side left empty), then we composite the framed screenshot on top
// with Sharp.
const AD_SIZE = 1080;

export interface ScreenshotAdOptions {
  description: string;
  screenshotUrl: string;
  frameType: FrameType;
}

export async function generateScreenshotAd(
  brand: Record<string, unknown>,
  opts: ScreenshotAdOptions,
  seed: string
): Promise<GeneratedAd> {
  // 1) Frame the screenshot.
  const shotBuf = await loadImageBuffer(opts.screenshotUrl);
  const framed = await compositeScreenshotInFrame(shotBuf, opts.frameType);

  // 2) Vision describe (downscaled) so copy matches the product.
  let visionDesc = "";
  try {
    const small = await sharp(shotBuf).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    visionDesc = await describeScreenshot(`data:image/jpeg;base64,${small.toString("base64")}`);
  } catch {
    /* vision optional */
  }

  // 3) Colors/side/bg/font from the description + brand (reuse the studio engine).
  const parsed = await parseDescription(opts.description);
  const merged = mergeWithDefaults(parsed, brand, seed);
  const mockupSide: "left" | "right" = merged.side === "left" ? "left" : "right";

  // 4) Copy (Stratège voice / SaaS voice, with the 2-3 word split cap).
  const product = String(brand.product ?? "your product").slice(0, 120);
  const copy = await writeAdCopy({ product, description: visionDesc, brand, screenshot: true });

  // 5) DETERMINISTIC SPLIT LAYOUT. Ideogram makes ONLY a text-free background;
  //    the framed screenshot and the text are composited by us afterward, so
  //    placement is guaranteed (no reliance on Ideogram obeying instructions).
  const stratege = isStrategeBrand(brand);
  const textSide: "left" | "right" = mockupSide === "left" ? "right" : "left";
  const palette = stratege
    ? pickStrategePalette(fnv1a(seed))
    : { bg: merged.colors[0], accent: merged.colors[1], text: "" };

  // FLAT Sharp brand-color field for ALL screenshot ads — exact palette, no
  // Ideogram (zero stray marks / color drift, zero API cost, instant). Then
  // composite the framed screenshot + Sharp text on top.
  const prompt = "(flat Sharp brand-color background — no Ideogram)";
  const fallback = false;
  const bg = await sharp({
    create: { width: AD_SIZE, height: AD_SIZE, channels: 3, background: hexToRgb(palette.bg) },
  })
    .jpeg({ quality: 95 })
    .toBuffer();

  // The mockup must stay within its own half (never cross the centre line),
  // so the text half stays clean for the Sharp-rendered copy.
  const isPortrait = framed.height > framed.width;
  const half = AD_SIZE / 2;
  const boxW = (isPortrait ? 0.36 : 0.42) * AD_SIZE;
  const boxH = (isPortrait ? 0.74 : 0.6) * AD_SIZE;
  const scale = Math.min(boxW / framed.width, boxH / framed.height);
  const drawW = Math.round(framed.width * scale);
  const drawH = Math.round(framed.height * scale);
  const resizedFramed = await sharp(framed.buffer).resize(drawW, drawH).toBuffer();
  // Centre the mockup within its half.
  const left =
    mockupSide === "left"
      ? Math.round((half - drawW) / 2)
      : Math.round(half + (half - drawW) / 2);
  const top = Math.round((AD_SIZE - drawH) / 2);
  const composited = await sharp(bg)
    .composite([{ input: resizedFramed, left, top }])
    .jpeg({ quality: 95 })
    .toBuffer();

  // Persist the pre-text background (flat field + framed screenshot) so a
  // text-only edit can re-render over these exact pixels (Part C).
  const backgroundUrl = await storeImage(composited, "jpg");

  // 6b) Draw headline + subhead + CTA on the text side, inside a 5% safe zone,
  //     in the brand serif — guaranteed placement.
  const finalBuf = await drawSplitAdText(composited, {
    textSide,
    headline: copy.headline,
    subhead: copy.subhead,
    cta: copy.cta,
    palette: { bg: palette.bg, accent: palette.accent, text: palette.text },
  });
  const url = await storeImage(finalBuf, "jpg");
  await logPromptFile(prompt, url);

  const state: AdRenderState = {
    v: 3,
    backgroundUrl,
    brandLocked: stratege,
    palette: { bg: palette.bg, accent: palette.accent, text: palette.text },
    textSide,
    side: merged.side,
    seed,
    archetype: "HERO_LEFT",
    copy,
    // A screenshot ad's background is a composed device frame, not an Ideogram
    // field — only text-side edits are meaningful (no mood/product regen).
    productPhotoUrl: opts.screenshotUrl,
  };
  return {
    url,
    copy,
    mode: "text",
    color: "brand",
    lever: pickLever(seed),
    archetype: "HERO_LEFT",
    fallback,
    state,
    debug: {
      prompt,
      parsedFields: { visionDesc, frameType: opts.frameType, mockupSide, textSide },
      mergedFields: merged,
      levers: { palette, mockupSide, textSide, frameType: opts.frameType },
    },
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

// Full-canvas ad (any brand): Ideogram renders a TEXT-FREE background — a hero
// scene (Stratège), a NAMED product (user), an abstract mood field, or a remix
// of the real product photo — then Sharp composites the uploaded product photo
// (if any), the logo (if any), and the copy inside the 5% safe zone.
async function renderFullCanvasAd(opts: {
  copy: AdCopy;
  seed: string;
  side: AdLever["side"];
  brandLocked: boolean;
  palette: { bg: string; accent: string; text: string };
  product?: string;
  render?: string;
  photoUrl?: string; // present → remix (keep the real product) — legacy exact mode
  mood?: string | null;
  productPhotoUrl?: string; // brief role=product_photo → Sharp-composited hero
  logoUrl?: string; // brief role=logo → Sharp places it bottom corner
  archetype?: Archetype; // chosen layout (else auto-picked from seed+mood)
  aspectRatio?: string; // Part D: "1:1" | "4:5" | "9:16" | "1.91:1" | "16:9"
  price?: string;
  discount?: string;
}): Promise<{ url: string; fallback: boolean; prompt: string; archetype: Archetype; state: AdRenderState }> {
  const { copy, seed, side, brandLocked, palette, product, render, photoUrl, mood, productPhotoUrl, logoUrl } = opts;
  const textSide: "left" | "right" = side === "left" ? "left" : "right";
  const forRemix = !!photoUrl;

  // Resolve the display-typography archetype. Copy-heavy briefs → TEXT_HEAVY;
  // otherwise a seeded, mood-compatible pick. The config drives all Sharp geometry.
  const moodKey: Mood = isMood(mood) ? mood : "bold";
  const chosenArchetype: Archetype =
    opts.archetype ??
    pickArchetype(seed, moodKey, { copyHeavy: isCopyHeavy({ benefits: copy.bullets, price: opts.price }) });
  const archCfg = resolveArchetypeConfig(chosenArchetype, opts.aspectRatio);
  const { w: W, h: H, ideogram: ideoAspect } = canvasFor(opts.aspectRatio);

  const prompt = buildBackgroundPrompt({
    bg: palette.bg,
    accent: palette.accent,
    textSide,
    seed,
    brandLocked,
    // A Sharp-composited product photo means the BACKGROUND must stay abstract.
    product: productPhotoUrl ? undefined : product,
    render,
    forRemix,
    mood,
  });
  logPromptConsole(prompt);

  let result;
  if (forRemix) {
    const buf = await loadImageBuffer(photoUrl!);
    result = await remixImage({
      prompt,
      imageBuffer: buf,
      imageWeight: REMIX_IMAGE_WEIGHT,
      aspectRatio: ideoAspect,
    });
  } else {
    result = await generateImages({ prompt, count: 1, aspectRatio: ideoAspect });
  }

  let bg = await sharp(await loadImageBuffer(result.urls[0]))
    .resize(W, H, { fit: "cover" })
    .toBuffer();

  // Composite an uploaded product photo as the hero (floating treatment:
  // rounded corners + soft shadow), centred in the hero half.
  if (productPhotoUrl) {
    try {
      const photoBuf = await loadImageBuffer(productPhotoUrl);
      const framed = await compositeScreenshotInFrame(photoBuf, "floating");
      const half = W / 2;
      const isPortrait = framed.height > framed.width;
      const boxW = (isPortrait ? 0.38 : 0.44) * W;
      const boxH = (isPortrait ? 0.76 : 0.62) * H;
      const scale = Math.min(boxW / framed.width, boxH / framed.height);
      const drawW = Math.round(framed.width * scale);
      const drawH = Math.round(framed.height * scale);
      const resized = await sharp(framed.buffer).resize(drawW, drawH).toBuffer();
      const left =
        textSide === "left"
          ? Math.round(half + (half - drawW) / 2)
          : Math.round((half - drawW) / 2);
      const top = Math.round((H - drawH) / 2);
      bg = await sharp(bg).composite([{ input: resized, left, top }]).jpeg({ quality: 95 }).toBuffer();
    } catch {
      /* photo compositing is best-effort — the ad still works without it */
    }
  }

  // Persist the pre-text background so a text-only edit can re-render Sharp over
  // these exact pixels later with NO Ideogram call and NO credit (Part C).
  const backgroundUrl = await storeImage(bg, "jpg");

  // Logo: loaded here (fs/network), drawn by the text overlay — never Ideogram.
  let logoBuf: Buffer | undefined;
  if (logoUrl) {
    try {
      logoBuf = await loadImageBuffer(logoUrl);
    } catch {
      /* optional */
    }
  }

  const final = await drawSplitAdText(bg, {
    textSide,
    headline: copy.headline,
    subhead: copy.subhead,
    cta: copy.cta,
    palette,
    logo: logoBuf,
    archetype: archCfg,
    benefits: copy.bullets,
    price: opts.price,
    discount: opts.discount,
  });
  const url = await storeImage(final, "jpg");
  await logPromptFile(prompt, url);

  const state: AdRenderState = {
    v: 3,
    backgroundUrl,
    brandLocked,
    palette,
    textSide,
    side,
    seed,
    render,
    archetype: chosenArchetype,
    aspectRatio: opts.aspectRatio,
    mood: mood ?? undefined,
    copy,
    price: opts.price,
    discount: opts.discount,
    logoUrl,
    productPhotoUrl,
    productName: product,
  };
  return { url, fallback: result.fallback, prompt, archetype: chosenArchetype, state };
}

// ─── Part C: conversational-editing re-renders ───────────────────────────────

// Re-draw the text/logo layer over a previously stored background — the FREE
// path for a text-side edit (copy / archetype / logo slot). No Ideogram call,
// no credit, and the background pixels are byte-identical to the original.
export async function rerenderOverBackground(
  state: AdRenderState
): Promise<{ url: string; state: AdRenderState }> {
  const bg = await loadImageBuffer(state.backgroundUrl);
  let logoBuf: Buffer | undefined;
  if (state.logoUrl) {
    try {
      logoBuf = await loadImageBuffer(state.logoUrl);
    } catch {
      /* optional */
    }
  }
  const final = await drawSplitAdText(bg, {
    textSide: state.textSide,
    headline: state.copy.headline,
    subhead: state.copy.subhead ?? "",
    cta: state.copy.cta,
    palette: state.palette,
    logo: logoBuf,
    logoCorner: state.logoCorner,
    archetype: resolveArchetypeConfig(state.archetype, state.aspectRatio),
    benefits: state.copy.bullets,
    price: state.price,
    discount: state.discount,
  });
  const url = await storeImage(final, "jpg");
  return { url, state: { ...state, pendingEdit: null } };
}

// Regenerate the Ideogram background for a background-side edit (mood / product),
// keeping the same copy, archetype, palette and layout. Costs 1 credit.
export async function regenerateFromState(state: AdRenderState): Promise<GeneratedAd> {
  const r = await renderFullCanvasAd({
    copy: state.copy,
    seed: state.seed,
    side: state.side,
    brandLocked: state.brandLocked,
    palette: state.palette,
    product: state.productPhotoUrl ? undefined : state.productName,
    render: state.render,
    mood: state.mood,
    productPhotoUrl: state.productPhotoUrl,
    logoUrl: state.logoUrl,
    archetype: state.archetype,
    aspectRatio: state.aspectRatio,
    price: state.price,
    discount: state.discount,
  });
  const nextState: AdRenderState = { ...r.state, logoCorner: state.logoCorner, pendingEdit: null };
  return {
    url: r.url,
    copy: state.copy,
    mode: "text",
    color: "brand",
    lever: pickLever(state.seed),
    archetype: r.archetype,
    fallback: r.fallback,
    state: nextState,
    debug: { prompt: r.prompt, levers: { regen: true, mood: state.mood, archetype: r.archetype } },
  };
}

// Stored per generated message so an edit can regenerate without re-asking.
export interface AdImageMeta {
  v: 2;
  productName?: string;
  productDescription?: string;
  photoUrl?: string;
  mode: AdMode | "text";
  color: ColorCombo;
  copy: AdCopy;
  lever: AdLever;
}

// Regenerate an existing ad with patched copy (and/or color), reusing the same
// product, mode, and lever so the design stays consistent.
export async function editAd(
  brand: Record<string, unknown>,
  meta: AdImageMeta,
  patchedCopy: AdCopy,
  color?: ColorCombo
): Promise<GeneratedAd> {
  const brief: AdBrief = {
    v: 2,
    request: "",
    productSource: meta.photoUrl ? "upload" : "text",
    productName: meta.productName,
    productDescription: meta.productDescription,
    photoUrl: meta.photoUrl,
    mode: meta.mode === "text" ? undefined : meta.mode,
    color: color ?? meta.color,
    copy: patchedCopy,
    lever: meta.lever,
  };
  return generateAd(brand, brief, JSON.stringify(meta.lever));
}
