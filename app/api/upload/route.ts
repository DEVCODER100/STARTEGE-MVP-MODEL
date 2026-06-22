import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { storeImage } from "@/lib/storage";
import { limits } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Sniff the magic bytes so we trust the actual content, not the client header.
function sniffImage(buf: Buffer): "jpg" | "png" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "png";
  // WebP: "RIFF"...."WEBP" → re-encode to jpg via the jpg path is overkill;
  // accept it as-is is not supported by sniff→ext map, so treat as png-safe.
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "png";
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many uploads — slow down a bit.", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large (max 8 MB)." },
        { status: 413 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = sniffImage(buf);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file. Upload a JPG, PNG, or WebP image." },
        { status: 415 }
      );
    }

    const url = await storeImage(buf, ext);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
