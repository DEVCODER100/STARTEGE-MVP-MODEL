import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client-side events (copy, download) post here.
const Body = z.object({
  type: z.enum(["angle_copied", "image_downloaded"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    await logEvent(user.id, parsed.data.type, parsed.data.metadata);
    return NextResponse.json({ ok: true });
  } catch {
    // Analytics endpoint — never surface errors loudly.
    return NextResponse.json({ ok: false });
  }
}
