import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { deleteImage } from "@/lib/storage";
import { updateAsset, deleteAsset, ASSET_TYPES } from "@/lib/brand-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Patch = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.enum(ASSET_TYPES as [string, ...string[]]).optional(),
  frame: z.enum(["laptop", "phone", "browser", "floating", "none"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const asset = await updateAsset(user.id, params.id, {
      name: parsed.data.name,
      type: parsed.data.type as never,
      frame: parsed.data.frame as never,
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthenticated" ? 401 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    const removed = await deleteAsset(user.id, params.id);
    if (!removed) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    // Best-effort blob cleanup (never blocks the response).
    await deleteImage(removed.asset_url);
    if (removed.thumbnail_url) await deleteImage(removed.thumbnail_url);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthenticated" ? 401 : 500 });
  }
}
