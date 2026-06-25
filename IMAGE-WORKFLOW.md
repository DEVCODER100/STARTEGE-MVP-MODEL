# Stratège — How an image is created (current "Ad Studio" workflow)

Native-text ad generation: Ideogram renders the finished ad — headline, subheadline,
and CTA are baked **inside** the image. There is no code/Canvas text overlay.

## Model & endpoints
- **Model:** Ideogram **4.0 Turbo** (v4 API), `rendering_speed = TURBO`, ~**$0.03 / image**.
- **Generate** (text → image): `POST https://api.ideogram.ai/v1/ideogram-v4/generate`
  - multipart fields: `text_prompt`, `rendering_speed=TURBO`, `aspect_ratio` (`4x5`/`1x1`/`9x16`), `num_images`
  - header: `Api-Key: $IDEOGRAM_API_KEY`
- **Remix** (real product photo → ad): `POST https://api.ideogram.ai/v1/ideogram-v4/remix`
  - multipart: `image` (the uploaded photo), `text_prompt`, `image_weight=68` (60–75: keep product recognisable while allowing a new background + text), `rendering_speed=TURBO`, `aspect_ratio`
- No key set → falls back to picsum placeholder URLs (so dev works without spend).

## End-to-end flow
1. **Intent** — user asks for an image, or uploads a product photo, in chat.
   Detected by a keyword check, else a tiny Haiku classifier; a photo forces image intent.
   (`app/api/chat/route.ts`)
2. **Brief** (`lib/ad-brief.ts`) — collect, asking only what's missing:
   - product source: `upload` (photo) or `text` (typed product name)
   - if photo → **mode** chip: *Keep my exact product* (`exact`) or *Generate a stylized version* (`lookalike`)
   - **color combo** chip: brand / indigo_violet / teal_emerald / orange_rose / slate_cyan / black_gold
   - copy is **never asked** — it's auto-written.
3. **Vision** (uploads only) — Claude (Sonnet) describes the product photo in ≤30 words,
   product-only. (`lib/ad-copy.ts → describeProduct`)
4. **Auto copy** — Claude (Haiku) writes the on-image text:
   `headline` (2–5 words), `subhead` (3–8 words), `cta` (1–3 words) + a suggested color.
   (`lib/ad-copy.ts → writeAdCopy`)
5. **Build the prompt** (`lib/ad-prompt-builder.ts`) — the 6-part formula, with rotating
   "levers" so each ad looks unique (seeded by `chatId + timestamp`):
   - color pair (from combo, or derived from the brand color)
   - product side: left / right / center
   - render: `3D octane render` / `studio product photography` / `editorial product photo`
   - font: `bold geometric sans-serif` / `modern grotesk` / `bold condensed`
   - background: `clean gradient` / `soft radial gradient` / `smooth diagonal gradient`
6. **Generate** (`lib/ad-imagegen.ts → generateAd`):
   - `exact`  → **v4 remix** (uploaded photo + prompt + image_weight 68) → keeps the real product
   - `lookalike` / `text` → **v4 generate** (text_prompt from the description / product name)
7. **Render** — Ideogram returns the finished ad with native text. We re-host it to storage
   (Vercel Blob in prod, `public/generated` in dev) and return `{ url, copy, ... }`.
8. **Caption** — a ready-to-post caption is generated alongside.
9. **Edit** — natural language ("change the headline to X", "make it say 40% off") or the
   inline panel → `editAd` regenerates with the patched copy, reusing the same product,
   mode, color, and lever so the design stays consistent. (counts as one image generation)

## The exact prompt template
```
A bold, modern social media advertisement poster for {product}.
{SUBJECT}
{bg} background in {colorA} and {colorB}.
Large bold {font} headline at {position} reading "{headline}".
Smaller subheadline reading "{subhead}".
A small rounded pill button at the bottom reading "{cta}".
Minimal, high-contrast, magazine-grade, crisp typography, social-media ready, ready to post.
```
- **{SUBJECT}** for **generate/lookalike**: `{product description} placed on the {side}, {render}.`
- **{SUBJECT}** for **remix (exact product)**: `Keep the provided product object exactly as it is and place it on the {side}.`
- `{position}` is `the top left` (side left/right) or `the top center` (side center).

### Worked example (text mode, "gaming headphones")
```
A bold, modern social media advertisement poster for premium gaming headphones.
a sleek black over-ear gaming headset with glowing RGB accents placed on the right, 3D octane render.
smooth diagonal gradient background in #312E81 and #A855F7.
Large bold geometric sans-serif headline at the top left reading "LEVEL UP".
Smaller subheadline reading "NEXT-GEN SOUND".
A small rounded pill button at the bottom reading "SHOP NOW".
Minimal, high-contrast, magazine-grade, crisp typography, social-media ready, ready to post.
```

## Dual-input "Image Studio" flow (extension)
The chat brief flow above still exists. The Image Studio page (`/task`) adds a
second, parallel way to create an image — **structured selection + free text at
the same time**, with the **textarea as the single source of truth**.

1. **Two columns, no tabs.** Left: 9 color palettes + 4 styles + quick-add chips.
   Right: one "Describe what you want" textarea.
2. **Clicking a card appends a sentence** to the textarea (and clicking an active
   card removes that exact sentence). Active state is derived from the textarea
   text, so manual edits stay in sync. Quick-add chips: brand colors, logo,
   today's date, and the nearest upcoming Indian festival (within 14 days).
3. On **Generate**, the textarea content (only) is sent to `POST /api/image/studio`.
4. **Parse** (`lib/ad-brief-parser.ts`, Haiku) → extract structured fields as JSON
   (colors, position, render, background, lighting, mood, logo, headline, notes);
   unmentioned fields are `null`.
5. **Merge** (`lib/ad-brief-merger.ts`) → fill every `null` with a smart default:
   parsed → brand colors → rotating palette (colors); brand category → render
   (SaaS=3D, D2C=studio, service=editorial); rotating levers for the rest.
6. **Auto copy** (`writeAdCopy`) — unless the user gave an exact headline.
7. **Build** (`buildPromptFromMerged`) — the same 6-part formula, powered by the
   merged fields (adds logo / mood / notes lines).
8. **Render** — v4 generate (or v4 remix if an exact-product photo is attached) →
   store → return `{ url, copy }`.

New palettes (9 total): + Sage + Sand, Terracotta + Cream, Navy + Silver.
New explicit styles (4): Product hero, Editorial story, Modern system, Bold poster.

### Dual-input files
- `lib/ad-brief.ts` — `PALETTES` (9, with `description_text`), `STYLES` (4)
- `lib/ad-brief-parser.ts` — `parseDescription` (Haiku → structured JSON)
- `lib/ad-brief-merger.ts` — `mergeWithDefaults` (null → smart defaults)
- `lib/festivals.ts` — Indian festival calendar + `nearestFestival`
- `lib/ad-imagegen.ts → generateFromDescription` — parse → merge → copy → build → render
- `app/api/image/studio/route.ts` — endpoint; `app/(dashboard)/task/page.tsx` — UI

## Key files
- `lib/ideogram.ts` — Ideogram client (generate + remix, 4.0 Turbo)
- `lib/ad-brief.ts` — brief state machine (mode/color), color combos
- `lib/ad-copy.ts` — `describeProduct` (vision) + `writeAdCopy` + `editAdCopy`
- `lib/ad-prompt-builder.ts` — the 6-part prompt + lever rotation
- `lib/ad-imagegen.ts` — `generateAd` (exact/lookalike/text) + `editAd`
- `app/api/chat/route.ts` — orchestration; `app/api/upload`, `app/api/image/regenerate`
