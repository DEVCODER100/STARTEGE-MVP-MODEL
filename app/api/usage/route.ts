import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const usage = await getUsage(user.id);
    return NextResponse.json({ usage });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
