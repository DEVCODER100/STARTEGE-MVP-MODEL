import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { listAssets, effectiveAssetLimit } from "@/lib/brand-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const assets = await listAssets(user.id);
    const limit = effectiveAssetLimit(String((user as { plan?: string }).plan ?? "free"));
    return NextResponse.json({ assets, limit });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load assets";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
