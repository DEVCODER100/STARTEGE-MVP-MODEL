import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";

// Composites a screenshot into a device frame (or a clean floating treatment).
// Used by the screenshot ad pipeline. Frame PNGs live in
// /public/marketing-assets/device-frames/ and have a transparent "screen" area
// where the screenshot is placed; the metadata below tells us where that is.
//
// IMPORTANT: when you drop in real frame PNGs, set each frame's native size and
// `screen` rectangle (in px, at the PNG's native resolution) to match the file.
// Until a frame file exists, that type gracefully falls back to "floating".

export type FrameType = "laptop" | "phone" | "browser" | "floating";

interface FrameSpec {
  file: string;
  // The PNG's native pixel size and the transparent screen window within it.
  native: { w: number; h: number };
  screen: { x: number; y: number; w: number; h: number };
  // Corner radius to apply to the screenshot before it's placed (px).
  screenRadius: number;
}

// Defaults assume common mockup proportions — TUNE these to your actual PNGs.
const FRAMES: Record<Exclude<FrameType, "floating">, FrameSpec> = {
  laptop: {
    file: "macbook-pro-frame.png",
    native: { w: 2000, h: 1200 },
    screen: { x: 286, y: 92, w: 1428, h: 892 }, // MacBook-ish 16:10 screen window
    screenRadius: 6,
  },
  phone: {
    file: "iphone-14-frame.png",
    native: { w: 1200, h: 2400 },
    screen: { x: 78, y: 78, w: 1044, h: 2244 },
    screenRadius: 60,
  },
  browser: {
    file: "chrome-browser-frame.png",
    native: { w: 2000, h: 1320 },
    screen: { x: 24, y: 120, w: 1952, h: 1176 }, // content area below the chrome
    screenRadius: 0,
  },
};

const FRAMES_DIR = path.join(process.cwd(), "public", "marketing-assets", "device-frames");

export interface FramedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

// Rounded-corner mask for the screenshot (so it sits cleanly inside a bezel).
async function roundCorners(buf: Buffer, w: number, h: number, r: number): Promise<Buffer> {
  if (r <= 0) return buf;
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`
  );
  return sharp(buf)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

// "Floating" treatment: rounded corners + a soft drop shadow on transparency.
// Also the fallback when a frame PNG isn't present yet.
async function floatingTreatment(screenshot: Buffer): Promise<FramedImage> {
  const meta = await sharp(screenshot).metadata();
  const w = meta.width ?? 1600;
  const h = meta.height ?? 1000;
  const radius = Math.round(Math.min(w, h) * 0.025);
  const rounded = await roundCorners(await sharp(screenshot).png().toBuffer(), w, h, radius);

  const pad = Math.round(Math.min(w, h) * 0.06); // room for the shadow
  const canvasW = w + pad * 2;
  const canvasH = h + pad * 2;

  // Shadow: a dark rounded rectangle, blurred, offset slightly down.
  const shadowRect = Buffer.from(
    `<svg width="${canvasW}" height="${canvasH}"><rect x="${pad}" y="${pad + Math.round(pad * 0.25)}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="rgba(0,0,0,0.30)"/></svg>`
  );
  const shadow = await sharp(shadowRect).blur(Math.max(4, pad * 0.5)).png().toBuffer();

  const buffer = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: rounded, left: pad, top: pad },
    ])
    .png()
    .toBuffer();

  return { buffer, width: canvasW, height: canvasH };
}

async function frameExists(file: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(FRAMES_DIR, file));
  } catch {
    return null;
  }
}

export async function compositeScreenshotInFrame(
  screenshot: Buffer,
  frameType: FrameType
): Promise<FramedImage> {
  if (frameType === "floating") return floatingTreatment(screenshot);

  const spec = FRAMES[frameType];
  const framePng = await frameExists(spec.file);
  if (!framePng) {
    // No frame asset yet → clean floating treatment so the feature still works.
    return floatingTreatment(screenshot);
  }

  // Fit the screenshot to cover the transparent screen window, round its corners,
  // place it, then lay the frame on top.
  const fitted = await sharp(screenshot)
    .resize(spec.screen.w, spec.screen.h, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  const rounded = await roundCorners(fitted, spec.screen.w, spec.screen.h, spec.screenRadius);

  const buffer = await sharp({
    create: { width: spec.native.w, height: spec.native.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: rounded, left: spec.screen.x, top: spec.screen.y },
      { input: framePng, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  return { buffer, width: spec.native.w, height: spec.native.h };
}

// Maps the user's screenshot-kind answer to a frame type.
export function frameFromKind(kind: string): FrameType {
  switch (kind) {
    case "web":
    case "laptop":
    case "dashboard":
      return "laptop";
    case "mobile":
    case "phone":
      return "phone";
    case "landing":
    case "browser":
      return "browser";
    default:
      return "floating";
  }
}

export function isFrameType(v: unknown): v is FrameType {
  return v === "laptop" || v === "phone" || v === "browser" || v === "floating";
}
