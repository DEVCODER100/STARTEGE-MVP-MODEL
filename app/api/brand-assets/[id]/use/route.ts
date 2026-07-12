import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { recordUse } from "@/lib/brand-assets";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called when an asset is selected for a generation.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    await recordUse(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
