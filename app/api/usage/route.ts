import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/users";
import { getUsage } from "@/lib/usage";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const usage = await getUsage(user.id);
    return NextResponse.json({ usage });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
