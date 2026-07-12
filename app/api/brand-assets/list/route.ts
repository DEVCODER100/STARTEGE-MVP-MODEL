import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { listAssets, effectiveAssetLimit } from "@/lib/brand-assets";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const assets = await listAssets(user.id);
    const limit = effectiveAssetLimit(String((user as { plan?: string }).plan ?? "free"));
    return NextResponse.json({ assets, limit });
  } catch (e: unknown) {
    return errorJson(e, { fallback: "Failed to load assets" });
  }
}
