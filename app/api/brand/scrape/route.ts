import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { scrapeWebsite } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().min(3).max(300),
});

export async function POST(req: Request) {
  try {
    await getOrCreateUser();

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid url", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = await scrapeWebsite(parsed.data.url);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Scrape failed";
    const status = msg === "Unauthenticated" ? 401 : 200;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
