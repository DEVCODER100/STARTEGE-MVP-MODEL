import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { limits } from "@/lib/security";
import { interpretBrief } from "@/lib/brief-interpreter";
import { describeStyleReference } from "@/lib/ad-copy";
import { isAllowedImageUrl, loadImageBuffer } from "@/lib/storage";
import { briefSummary, IMAGE_ROLES, type BriefImage } from "@/lib/resolved-brief";
import { recentArchetypes } from "@/lib/repeat-guard";
import { pickArchetype, isCopyHeavy } from "@/lib/layout-archetypes";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The interpretation layer endpoint: raw text + upload roles → ResolvedBrief.
// The UI shows the returned summary + assumptions BEFORE any image money is spent.
const Body = z.object({
  text: z.string().min(1).max(2000),
  images: z
    .array(
      z.object({
        url: z.string().max(2000),
        role: z.enum(IMAGE_ROLES as [string, ...string[]]),
      })
    )
    .max(4)
    .default([]),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests — slow down a bit." }, { status: 429 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const images: BriefImage[] = parsed.data.images
      .filter((i) => isAllowedImageUrl(i.url))
      .map((i) => ({ id: i.url, role: i.role as BriefImage["role"] }));

    const sql = getDb();
    const rows = await sql`SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1`;
    const brand = rows[0] ?? {};

    // reference_style uploads contribute palette/mood hints only (never composited).
    let referenceNotes = "";
    const ref = images.find((i) => i.role === "reference_style");
    if (ref) {
      try {
        const buf = await loadImageBuffer(ref.id);
        const small = await sharp(buf).resize({ width: 768, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
        referenceNotes = await describeStyleReference(`data:image/jpeg;base64,${small.toString("base64")}`);
      } catch {
        /* hints are optional */
      }
    }

    const brief = await interpretBrief({ text: parsed.data.text, images, brand, referenceNotes });

    // Repeat guard: never name the same layout the user's last ad used. Re-roll
    // to a different mood-compatible archetype so the card shows the final style.
    const recent = await recentArchetypes(user.id, 2);
    if (recent[0] && recent[0] === brief.archetype) {
      brief.archetype = pickArchetype(`${brief.brand.name}:${brief.mood}:${brief.platform}:reroll`, brief.mood, {
        avoid: recent,
        copyHeavy: isCopyHeavy({ benefits: brief.copy.benefits, price: brief.copy.price }),
      });
    }

    return NextResponse.json({ brief, summary: briefSummary(brief) });
  } catch (e: unknown) {
    return errorJson(e, { fallback: "Could not interpret the request" });
  }
}
