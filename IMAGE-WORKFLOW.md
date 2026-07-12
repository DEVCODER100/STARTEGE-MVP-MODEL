# 🎨 Stratège — Image Creation Workflow & Session Log

> The complete, current picture of how Stratège turns a request into a finished
> ad image: the workflow, what's needed, every prompt used, and the four custom
> prompt templates built for different image types. Plus a log of everything
> shipped in this work session.

---

## PART A — Everything we shipped this session

| # | Feature | What it does | Commit |
|---|---|---|---|
| 1 | **Dual-input Image Studio** | Brief = structured palettes/styles **+** free text. Textarea is the single source of truth → parser → merger → prompt. 9 palettes, 4 styles, quick-add chips (brand colors / logo / today's date / nearest Indian festival). | `372ffd5` |
| 2 | **Library** | `/library` gallery of every image (studio + chat), newest first. New `generated_images` table. | `592abb4` |
| 3 | **Brand logo upload** | Upload/replace/remove a logo in Brand Book → `brand_profiles.logo_url`. | `d351547` |
| 4 | **Stratège brand locks** | 6 locks so Stratège's OWN ads look like Stratège (cream/green/noir only, no fake dashboards, founder voice, specific moments). `lib/brand-locks.ts`. User brands unaffected. | `3205e65` |
| 5 | **Prompt logging + debug** | console.log every prompt, append to `logs/image-prompts.log`, return `debug{}` from APIs, `?debug=true` panel in `/task`. | `1e3b85d` |
| 6 | **SaaS screenshot ads** | Upload an app/website screenshot → composited into a device frame (Sharp) → overlaid pixel-perfect on an Ideogram background. `lib/device-frames.ts`. | `33f26e6` |
| 7 | **Mobile / tablet nav fix** | Sidebar was hidden under 1024px → added `MobileNav` drawer (nav, profile, sign-out). Also fixed the admin portal. | `1aa0e92` |
| 8 | **Brand Book asset library** | Upload product screenshots ONCE, reuse forever. `brand_assets` table, 4 APIs, Brand Book grid + upload modal, Image Studio asset picker. | `4552896` |
| — | **Admin portal** (separate app, `D:\Stratege Admin`) | Real-time analytics: users, image counts, new-account toast, per-user data, limited admin actions. Reads the same Neon DB. | (separate repo) |

New DB tables this session: `generated_images`, `brand_assets`. New column: `brand_profiles.logo_url`.

---

## PART B — How an image is created (the workflow)

There are **four** generation paths. All of them end the same way: build a prompt →
call Ideogram 4.0 Turbo → re-host on Vercel Blob → save → return. Ideogram
**renders all text natively** (no code overlay for text).

```
                    ┌─────────────────────────────────────────────┐
   USER INPUT  ───▶ │  pick a path (auto-detected by the inputs)   │
                    └─────────────────────────────────────────────┘
   (1) chat brief        (2) dual-input        (3) Stratège self     (4) SaaS screenshot
   text/photo            textarea              -marketing            (app/site upload)
        │                    │                      │                      │
        ▼                    ▼                      ▼                      ▼
   writeAdCopy          parse → merge          writeStrategeCopy     frame compositor
   buildAdPrompt        buildPromptFromMerged  buildStrategeAdPrompt buildScreenshotAdPrompt
        │                    │                      │                      │
        └───────── Ideogram generate (or remix if real product photo) ────┤
                                                                           │ (screenshot path:
                                                                           │  Sharp overlays the
                                                                           │  framed screenshot)
                              ▼
                 store on Vercel Blob → save to generated_images → return {url, copy, debug}
```

### Step-by-step (the engine — `lib/ad-imagegen.ts`)
1. **Resolve the brief** — depending on path: parse the textarea (`parseDescription`,
   Haiku) → `mergeWithDefaults` fills nulls with smart defaults from the brand +
   a deterministic lever seed.
2. **(Optional) vision** — if a photo/screenshot is attached, Claude Sonnet
   describes it (`describeProduct` / `describeScreenshot`).
3. **Write copy** — `writeAdCopy` (Haiku) → `{headline, subhead, cta}`. Branches to
   the Stratège-voice or SaaS-voice writer when relevant.
4. **Build the prompt** — one of the 4 templates (Part D).
5. **Log the prompt** — `logPromptConsole` + `logPromptFile`.
6. **Render** — Ideogram v4 **generate** (text/lookalike) or **remix** (keeps a real
   uploaded product photo, `image_weight = 68`). No key → deterministic placeholders.
7. **(Screenshot path only)** — composite the framed screenshot onto the generated
   background with Sharp so UI text stays pixel-perfect.
8. **Re-host + save** — `storeImage` → Vercel Blob; insert into `generated_images`;
   return `{ url, copy, fallback, debug }`.

---

## PART C — What's needed

**Services / env**
| Need | Why | Env var |
|---|---|---|
| Ideogram 4.0 Turbo | the actual image render | `IDEOGRAM_API_KEY` |
| Claude via OpenRouter | copy + vision | `OPENROUTER_API_KEY` |
| Vercel Blob | host the result | `BLOB_READ_WRITE_TOKEN` |
| Neon Postgres | save to Library / assets | `DATABASE_URL` |

**Models:** Sonnet 4.5 (`anthropic/claude-sonnet-4.5`, vision/quality) · Haiku 4.5
(`anthropic/claude-haiku-4.5`, fast copy + parsing).

**Inputs by path:** (1) a request + optional product photo + mode (exact/lookalike);
(2) textarea content (palettes/styles/chips/free text); (3) brand name = "Stratège"
or a `self_marketing` flag; (4) a screenshot URL + a device-frame type.

**Output:** a 1080×1080 JPG on Vercel Blob + the copy + a `debug` payload.

---

## PART D — The four custom prompt templates (the actual prompts)

> Ideogram renders the quoted headline/subhead/CTA text directly inside the image.
> Uniqueness comes from rotating "levers" off a deterministic seed: **side**
> (left/right/center), **render** (3D / studio photo / editorial), **font**, and
> **background** style.

### 1. Standard product ad — `buildAdPrompt` (chat flow)
```
A bold, modern social media advertisement poster for {product}.
{subject}
{bg} background in {colorA} and {colorB}.
Large bold {font} headline at {headlinePos} reading "{headline}".
Smaller subheadline reading "{subhead}".
{ctaLine}Minimal, high-contrast, magazine-grade, crisp typography, social-media ready, ready to post.
```
- `subject` (generate): `{description||product} placed on the {side}, {render}.`
- `subject` (remix / real photo): `Keep the provided product object exactly as it is and place it on the {side}.`
- `ctaLine`: `A small rounded pill button at the bottom reading "{cta}". `

### 2. Dual-input merged — `buildPromptFromMerged` (Image Studio)
Same 6-part skeleton, powered by the merged brief, with extra lines when present:
`{lighting}` clause on the subject, a logo line, an extra-notes line, and a mood line.

### 3. Stratège self-marketing — `buildStrategeAdPrompt` (brand-locked)
```
A warm, editorial social-media advertisement poster for Stratège — a content thinking
partner for founders. Founder-personal and magazine-grade. This is NOT a generic SaaS ad.

Hero: {one of 10 concrete founder scenes}.

Color palette — use ONLY these three colors: {bg} background, {accent} accent, {text} text.
Warm, editorial, high-contrast. Absolutely no purple, violet, indigo, neon colors,
bright blue gradients, rainbow gradients, SaaS purple-to-pink gradients.

Large bold serif headline as the focal point reading "{headline}".
Smaller subheadline reading "{subhead}".
{A solid {accent}-filled pill CTA button ... reading "{cta}". }{Place the small Stratège logo ... bottom-left ...}

DO NOT include: fake dashboards, chart mockups, bar graphs or line graphs, pie charts,
generic UI fragments, abstract data visualizations, floating cards with fake numbers,
analytics interfaces, robot or AI imagery, brain illustrations, lightbulb 'idea' icons,
speed lines, lightning bolts, or rockets, ... any decorative graphic that resembles a chart or dashboard.

Composition rules — strict: ONE dominant focal point; ONE supporting element; negative space
≥ 40% of the frame; CTA solid-filled, high-contrast; logo small (~8%) bottom-left/right;
every element must relate to the message.

Editorial, warm, founder-personal, generous negative space, crisp typography, ready to post.
```
**Palettes (weighted):** cream `#F5F1EA`/`#1D9E75`/`#1A1A1A` (60%) · green
`#1D9E75`/`#F5F1EA`/`#FFFFFF` (25%) · noir `#0A0C0F`/`#5DCAA5`/`#F0F0F0` (15%).

### 4. SaaS screenshot ad — `buildScreenshotAdPrompt`
Ideogram makes **only the background + text** and leaves the mockup side empty; the
real screenshot is overlaid afterward with Sharp.
```
A bold, modern social-media advertisement poster for a software product. {It is a software product: <vision desc>}
Keep the entire {mockupSide} half of the composition as clean, empty negative space — a product
screenshot will be placed there separately. Do NOT draw any device, laptop, phone, browser window,
app screen, dashboard, chart, or any user interface anywhere in the image.
{bg} background in {colorA} and {colorB}.
Large bold {font} headline on the {textSide} reading "{headline}".
Smaller subheadline beneath it reading "{subhead}".
{A small rounded pill button reading "{cta}". }Minimal, high-contrast, magazine-grade, crisp typography,
generous negative space, social-media ready, ready to post.
```

---

## PART E — The supporting AI prompts (copy + vision + parsing)

**Generic copy** (`writeAdCopy`, Haiku) → strict JSON `{headline, subhead, cta, color}`;
headline 2–5 words, subhead 3–8, cta 1–3.

**Stratège voice** (`writeStrategeCopy`) — bans "Strategy Made X / in Minutes Not Days /
Co-Pilot / Create Stunning / Save Time / supercharge / 10x …", requires founder-voice
(questions, truths, specific moments). Validates + regenerates up to 3×, curated fallback.

**SaaS voice** (`writeScreenshotCopy`) — outcome-driven; bans "AI-powered / intelligent /
cutting-edge / revolutionary / next-gen / smart / supercharge"; regenerates if violated.

**Vision — product** (`describeProduct`, Sonnet): ≤30 words, object/material/color/finish/shape only.

**Vision — screenshot** (`describeScreenshot`, Sonnet): ≤30 words — product category,
main UI element, visual style.

**Parser** (`parseDescription`, Haiku) — reads the textarea, returns JSON with nulls for
anything unmentioned: `colors{primary,secondary,palette_name}`, `product_position`,
`render_style`, `background`, `lighting`, `mood`, `logo_present`, `logo_position`,
`headline_text`, `extra_notes`. The **merger** fills every null with a smart default.

---

## PART F — Screenshot → device-frame pipeline (`lib/device-frames.ts`)
1. `compositeScreenshotInFrame(screenshot, frameType)` — laptop / phone / browser /
   floating. Fits the screenshot into the frame PNG's transparent screen window (Sharp);
   **floating** = rounded corners + soft shadow, and is the graceful fallback when a frame
   PNG isn't present yet.
2. Ideogram generates the background + text (mockup side empty).
3. Sharp scales + positions the framed screenshot on the reserved side → final 1080² JPG.
   → UI text stays **pixel-perfect** (no Ideogram corruption).

Frame PNGs live in `public/marketing-assets/device-frames/` (you supply real MacBook /
iPhone / browser PNGs; see that folder's README for the screen-rectangle config).

---

## PART G — Brand Book asset library (reuse, no re-upload)
`brand_assets` table (name, type, url, thumbnail, default frame, width/height, use_count,
last_used_at). Upload once in Brand Book or the Image Studio; pick from a dropdown on every
future ad. The selected asset's URL + default frame feed the **same** screenshot pipeline
above — increments `use_count`, updates `last_used_at`. MVP cap: 25/user (plan tiers ready
for when billing launches).

---

## PART H — Where to see the exact prompt for any image
- **Dev terminal:** every prompt is `console.log`'d with a marker before the API call.
- **Log file:** `logs/image-prompts.log` (local only; gitignored).
- **API:** `/api/image/studio` and `/api/chat` return `debug{ prompt, parsedFields, mergedFields, levers }`.
- **UI:** in the Image Studio, add `?debug=true` to the URL → a "Debug: show prompt" panel
  under the result.

---

*Key files:* `lib/ad-imagegen.ts` (orchestrator) · `lib/ad-prompt-builder.ts` (4 templates) ·
`lib/ad-copy.ts` (copy + vision) · `lib/ad-brief-parser.ts` + `lib/ad-brief-merger.ts`
(dual-input) · `lib/brand-locks.ts` · `lib/device-frames.ts` · `lib/brand-assets.ts` ·
`lib/ideogram.ts` (client) · `lib/prompt-log.ts`.
