import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import {
  canGenerateImage,
  consumeImage,
  getUsage,
  MVP_LIMIT_MESSAGE,
} from "@/lib/usage";
import { generateFromDescription, generateScreenshotAd } from "@/lib/ad-imagegen";
import { isAllowedImageUrl } from "@/lib/storage";
import { isAdMode } from "@/lib/ad-brief";
import { isFrameType } from "@/lib/device-frames";
import { IMAGE_ROLES, isMood, isArchetype } from "@/lib/resolved-brief";
import { recordArchetype } from "@/lib/repeat-guard";
import { limits } from "@/lib/security";
import { logEvent } from "@/lib/events";
import { errorJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Image Studio generation. Preferred input: the interpreted ResolvedBrief
// (`brief` + `images` with roles). Legacy fields (photoUrl/screenshotUrl/…)
// remain accepted so older clients keep working. Roles route to existing paths:
//   product_photo → Sharp-composited hero over an abstract background
//   screenshot    → device frame + flat brand background
//   logo          → Sharp places it (never sent to Ideogram)
//   reference_style → palette/mood hints only (consumed at interpret time)
const Body = z.object({
  description: z.string().min(1).max(2000),
  photoUrl: z.string().max(2000).optional(),
  mode: z.string().optional(),
  screenshotUrl: z.string().max(2000).optional(),
  frameType: z.string().max(20).optional(),
  useBrandLogo: z.boolean().optional(), // opt-in: place the saved brand logo
  images: z
    .array(
      z.object({
        url: z.string().max(2000),
        role: z.enum(IMAGE_ROLES as [string, ...string[]]),
      })
    )
    .max(4)
    .optional(),
  brief: z
    .object({
      product: z
        .object({
          source: z.enum(["uploaded", "named", "none"]).optional(),
          name: z.string().max(120).optional(),
        })
        .optional(),
      mood: z.string().max(20).optional(),
      archetype: z.string().max(20).optional(),
      aspectRatio: z.string().max(12).optional(),
      copy: z
        .object({
          headline: z.string().max(120).optional(),
          subhead: z.string().max(200).optional(),
          cta: z.string().max(40).optional(),
          bullets: z.array(z.string().max(40)).max(3).optional(),
          price: z.string().max(40).optional(),
          discount: z.string().max(40).optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const rl = limits.generation(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many generations — slow down a bit.", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { description, brief } = parsed.data;

    if (!(await canGenerateImage(user.id))) {
      await logEvent(user.id, "limit_hit", { limitType: "images" });
      return NextResponse.json({ error: MVP_LIMIT_MESSAGE, mvpLimit: true }, { status: 429 });
    }

    const sql = getDb();
    const brandRows = await sql`SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1`;
    const brand = brandRows[0] ?? {};

    // Resolve uploaded images by role (allowlisted URLs only).
    const images = (parsed.data.images ?? []).filter((i) => isAllowedImageUrl(i.url));
    const roleUrl = (role: string) => images.find((i) => i.role === role)?.url;
    const productPhotoUrl = roleUrl("product_photo");
    const logoUrl = roleUrl("logo");

    // Legacy fields (older clients).
    const legacyPhotoUrl =
      parsed.data.photoUrl && isAllowedImageUrl(parsed.data.photoUrl) ? parsed.data.photoUrl : undefined;
    const mode = parsed.data.mode && isAdMode(parsed.data.mode) ? parsed.data.mode : undefined;
    const screenshotUrl = roleUrl("screenshot") ??
      (parsed.data.screenshotUrl && isAllowedImageUrl(parsed.data.screenshotUrl)
        ? parsed.data.screenshotUrl
        : undefined);
    const frameType = isFrameType(parsed.data.frameType) ? parsed.data.frameType : "floating";

    const seed = `${user.id}:${Date.now()}`;
    const mood = brief?.mood && isMood(brief.mood) ? brief.mood : undefined;

    const result = screenshotUrl
      ? await generateScreenshotAd(brand, { description, screenshotUrl, frameType }, seed)
      : await generateFromDescription(
          brand,
          {
            description,
            photoUrl: legacyPhotoUrl,
            mode,
            useBrandLogo: parsed.data.useBrandLogo,
            brief: brief
              ? {
                  productSource:
                    brief.product?.source ?? (productPhotoUrl ? "uploaded" : undefined),
                  productName: brief.product?.name,
                  productPhotoUrl,
                  logoUrl,
                  mood,
                  archetype:
                    brief.archetype && isArchetype(brief.archetype) ? brief.archetype : undefined,
                  aspectRatio: brief.aspectRatio,
                  copy: brief.copy,
                  price: brief.copy?.price,
                  discount: brief.copy?.discount,
                }
              : productPhotoUrl || logoUrl || mood
              ? { productPhotoUrl, logoUrl, mood, productSource: productPhotoUrl ? "uploaded" : undefined }
              : undefined,
          },
          seed
        );

    await consumeImage(user.id);
    await logEvent(user.id, "image_generated", { kind: "studio", fallback: result.fallback });
    await recordArchetype(user.id, result.archetype); // repeat-guard history

    // Save to the Library (best-effort — never fail the request on this).
    try {
      await sql`
        INSERT INTO generated_images (user_id, url, headline, source)
        VALUES (${user.id}, ${result.url}, ${result.copy?.headline ?? null}, 'studio')
      `;
    } catch {
      /* ignore */
    }

    const usage = await getUsage(user.id);
    return NextResponse.json({
      url: result.url,
      copy: result.copy,
      fallback: result.fallback,
      usage,
      debug: result.debug,
    });
  } catch (e: unknown) {
    return errorJson(e);
  }
}
