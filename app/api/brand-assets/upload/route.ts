import { NextResponse } from "next/server";
import sharp from "sharp";
import { getOrCreateUser } from "@/lib/users";
import { storeImage } from "@/lib/storage";
import { limits } from "@/lib/security";
import {
  countAssets,
  createAsset,
  effectiveAssetLimit,
  frameDefaultForType,
  isAssetType,
  isFrameDefault,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "@/lib/brand-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_SIDE = 4096;

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many uploads — slow down a bit." }, { status: 429 });
    }

    // Enforce the per-user asset cap before doing any work.
    const count = await countAssets(user.id);
    const limit = effectiveAssetLimit(String((user as { plan?: string }).plan ?? "free"));
    if (count >= limit) {
      return NextResponse.json(
        { error: `You've reached your limit of ${limit} saved assets. Delete one to add another.`, limitReached: true },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
    }

    const type: AssetType = isAssetType(form.get("asset_type")) ? (form.get("asset_type") as AssetType) : "other";
    const frame = isFrameDefault(form.get("device_frame_default"))
      ? (form.get("device_frame_default") as ReturnType<typeof frameDefaultForType>)
      : frameDefaultForType(type);
    const rawName = String(form.get("asset_name") ?? "").trim().slice(0, 80);
    const name = rawName || `Untitled — ${ASSET_TYPE_LABELS[type]}`;

    const buf = Buffer.from(await file.arrayBuffer());

    // Validate it's a real image + read dimensions.
    let meta;
    try {
      meta = await sharp(buf).metadata();
    } catch {
      return NextResponse.json({ error: "Unsupported file. Upload a JPG or PNG." }, { status: 415 });
    }
    const ext: "png" | "jpg" = meta.hasAlpha ? "png" : "jpg";

    // Downscale very large screenshots before storing.
    let pipeline = sharp(buf);
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longest > MAX_SIDE) {
      pipeline = pipeline.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside" });
    }
    const fullBuf = await pipeline.toFormat(ext).toBuffer();
    const fullMeta = await sharp(fullBuf).metadata();

    // Thumbnail for the UI.
    const thumbBuf = await sharp(buf)
      .resize({ width: 400, withoutEnlargement: true })
      .toFormat(ext)
      .toBuffer();

    const [asset_url, thumbnail_url] = await Promise.all([
      storeImage(fullBuf, ext),
      storeImage(thumbBuf, ext),
    ]);

    const asset = await createAsset({
      userId: user.id,
      name,
      type,
      url: asset_url,
      thumbnailUrl: thumbnail_url,
      frame,
      width: fullMeta.width ?? null,
      height: fullMeta.height ?? null,
    });

    return NextResponse.json({ asset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
