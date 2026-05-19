// Ideogram client — LOCKED to Ideogram 3.0 Turbo (v3 API).
// One model only. Falls back to placeholder URLs if no key is configured,
// so the UI is fully testable without spending credits.

const IDEOGRAM_V3_URL = "https://api.ideogram.ai/v1/ideogram-v3/generate";

// The single model Stratège uses. Do not change without intent — cost depends on it.
const RENDERING_SPEED = "TURBO"; // 3.0 Turbo — ~$0.03 / image

export interface ImageGenOptions {
  prompt: string;
  count?: number; // 1-3
  aspectRatio?: "ASPECT_4_5" | "ASPECT_1_1" | "ASPECT_9_16";
}

export interface ImageGenResult {
  urls: string[];
  fallback: boolean;
  reason?: string;
}

// Map our legacy aspect tokens to v3's "WxH" format.
const ASPECT_V3: Record<string, string> = {
  ASPECT_4_5: "4x5",
  ASPECT_1_1: "1x1",
  ASPECT_9_16: "9x16",
};

function placeholders(prompt: string, count: number): string[] {
  const seed = encodeURIComponent(prompt.slice(0, 60));
  return Array.from({ length: count }).map(
    (_, i) => `https://picsum.photos/seed/${seed}-${i}/1080/1350`
  );
}

export async function generateImages(
  opts: ImageGenOptions
): Promise<ImageGenResult> {
  const count = Math.min(Math.max(opts.count ?? 3, 1), 3);
  const aspect = ASPECT_V3[opts.aspectRatio ?? "ASPECT_4_5"] ?? "4x5";

  if (!process.env.IDEOGRAM_API_KEY) {
    return {
      urls: placeholders(opts.prompt, count),
      fallback: true,
      reason: "IDEOGRAM_API_KEY not set",
    };
  }

  try {
    // v3 generate expects multipart/form-data.
    const form = new FormData();
    form.append("prompt", opts.prompt);
    form.append("rendering_speed", RENDERING_SPEED);
    form.append("aspect_ratio", aspect);
    form.append("num_images", String(count));

    const res = await fetch(IDEOGRAM_V3_URL, {
      method: "POST",
      headers: {
        // Do NOT set Content-Type — fetch sets the multipart boundary.
        "Api-Key": process.env.IDEOGRAM_API_KEY,
      },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        urls: placeholders(opts.prompt, count),
        fallback: true,
        reason: `Ideogram ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const urls: string[] = (data?.data ?? [])
      .map((d: { url?: string }) => d.url)
      .filter((u: unknown): u is string => typeof u === "string" && !!u);

    if (urls.length === 0) {
      return {
        urls: placeholders(opts.prompt, count),
        fallback: true,
        reason: "Ideogram returned no urls",
      };
    }
    return { urls, fallback: false };
  } catch (e: unknown) {
    return {
      urls: placeholders(opts.prompt, count),
      fallback: true,
      reason: e instanceof Error ? e.message : "Image gen failed",
    };
  }
}

// Backward-compat wrapper.
export async function generateImage(prompt: string): Promise<string[]> {
  const r = await generateImages({ prompt });
  return r.urls;
}
