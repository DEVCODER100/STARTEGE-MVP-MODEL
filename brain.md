# 🧠 brain.md — Stratège Project Brain

> **This file is the single source of truth for the entire project.**
> If you (Claude, or any agent) ever get stuck, lose context, or are unsure how
> something works — **read this file first**, not the chat history. It is kept
> current with the real code. Last verified against the codebase: **2026-06-25**.
>
> How to use it: skim the Table of Contents, jump to the section you need, act.
> When you change something structural, update the matching section here.

---

## 0. Table of Contents
1. What Stratège is (product & vision)
2. Current status & progress snapshot
3. Tech stack
4. Repository map (folders & key files)
5. Routes — pages & API
6. Database (live tables)
7. Core workflows (how everything actually works)
8. The image-generation system (the core IP) — deep dive
9. External services, APIs & environment variables
10. Auth & security
11. Usage limits & billing model
12. Brand identity & design tokens
13. What is complete
14. What is pending / known gaps
15. "What if" — edge cases & failure modes
16. Deploy workflow
17. Conventions — how to work in this repo
18. Glossary

---

## 1. What Stratège is (product & vision)
**Stratège** is a **content thinking partner for founders** — it turns everyday
business moments ("I shipped X today") into finished marketing: posts in the
founder's voice and ready-to-post ad images. It is **not** a generic "AI
marketing tool"; the brand is warm, editorial, founder-personal (cream + dark
green, serif headlines), the opposite of purple-gradient SaaS.

- **Live domain:** https://stratege.in (Vercel).
- **Audience:** early-stage founders, primarily India (festivals, INR/Razorpay,
  WhatsApp reminders are India-aware).
- **Stage:** MVP / early access. No payments active yet; daily limits keep API
  spend predictable.

---

## 2. Current status & progress snapshot
- **Public front door (landing / pricing / login / signup):** faithfully ported
  from the design source and **live**.
- **Core image generation:** working — chat flow + dual-input Image Studio,
  9 palettes / 4 styles, parser→merger pipeline, Stratège brand locks, prompt
  logging + debug panel. All deployed.
- **Auth:** NextAuth v5 (JWT), email/password + Google OAuth — working & verified
  live.
- **Recent work (this era of the project):**
  1. Dual-input Image Studio (palettes/styles + natural language).
  2. Library page (gallery of every generated image).
  3. Brand Book logo upload.
  4. Stratège brand locks (self-marketing ads look like Stratège).
  5. Prompt logging + debug inspection.
- **Still pending:** faithful redesign of inner app pages (dashboard/brand/
  onboarding), real logo compositing onto images, payments wiring, password
  reset / email verification. See §14.

---

## 3. Tech stack
| Layer | Choice |
|---|---|
| Framework | **Next.js 14.2.35**, App Router, TypeScript, React 18 |
| Styling | **Tailwind CSS 3.4** + custom design tokens (see §12) |
| Animation | framer-motion v12 |
| DB | **Neon Postgres** via `@neondatabase/serverless` (HTTP driver) |
| Auth | **NextAuth v5** (Auth.js beta), JWT sessions |
| LLM | **Claude via OpenRouter** — Sonnet 4.5 (vision/quality), Haiku 4.5 (fast) |
| Images | **Ideogram 4.0 Turbo** (generate + remix; native text rendering) |
| Image libs | `sharp`, `@napi-rs/canvas` (legacy overlay) |
| Storage | **Vercel Blob** (`@vercel/blob`) |
| Payments | **Razorpay** (built, not active in MVP) |
| Analytics | PostHog (`posthog-js`) |
| Scraping | `cheerio` (brand website scrape) |
| Hosting | **Vercel** → push to `main` auto-deploys to stratege.in |

> Note: `@clerk/nextjs` is still a dependency and the `users.clerk_id` column
> exists, but **auth is NextAuth, not Clerk** — Clerk is legacy residue.

---

## 4. Repository map (key files)
```
D:\Stratege
├─ auth.ts                  NextAuth v5 config (providers, callbacks)
├─ lib/schema.sql           Base 6-table schema (more added via migrations)
├─ scripts/db-*.mjs         DB setup + migrations (run with npm run db:*)
├─ app/
│  ├─ (marketing)/          Public: landing, pricing, styleguide
│  ├─ (auth)/               login, signup
│  ├─ (onboarding)/         onboarding wizard
│  ├─ (dashboard)/          desk, image studio, library, brand, coach, shipped, upgrade
│  ├─ admin/                admin dashboard
│  └─ api/                  all backend routes (see §5)
├─ components/              UI (marketing/, dashboard/, chat/, brand/, app/, ui/)
└─ lib/                     all business logic (see below)
```

### lib/ — what each file does
**Image generation (the core, active):**
- `ad-brief.ts` — types + data: 9 color `PALETTES`, 4 `STYLES`, `AdBrief`,
  `AdMode` (`exact`|`lookalike`), `ColorCombo`, label/id maps, type guards.
- `ad-brief-parser.ts` — `parseDescription(text)`: Haiku → `ParsedBrief` (JSON,
  nulls for unmentioned fields).
- `ad-brief-merger.ts` — `mergeWithDefaults(parsed, brand, seed)` → `MergedBrief`
  (fills nulls with smart defaults from brand + lever seed).
- `ad-prompt-builder.ts` — `buildAdPrompt` (6-part formula), `buildPromptFromMerged`,
  **`buildStrategeAdPrompt`** (brand-locked), `pickLever`, `resolveCombo`.
- `ad-copy.ts` — `describeProduct` (Sonnet vision), `writeAdCopy` (Haiku) +
  `writeStrategeCopy` (locked voice + banned-pattern validation), `editAdCopy`.
- `ad-imagegen.ts` — **orchestrator**: `generateAd`, `generateFromDescription`,
  `editAd`. Returns `GeneratedAd { url, copy, mode, color, lever, fallback, debug }`.
- `ideogram.ts` — Ideogram client: `generateImages`, `remixImage` (image_weight 68),
  `ASPECT_V3`. Placeholder fallback when no API key.
- `brand-locks.ts` — **single source of truth for "Stratège brand"** in image gen:
  3 palettes, banned colors, hero treatments, negatives, composition rules,
  banned headline/CTA patterns + validators, `isStrategeBrand()`.
- `prompt-log.ts` — `logPromptConsole` + `logPromptFile` (→ `logs/image-prompts.log`,
  local only, gitignored).
- `festivals.ts` — Indian festival calendar + `nearestFestival(14)`.
- `creative-direction.ts` — `resolveBrandColor`, palette helpers.
- `storage.ts` — `storeImage(buffer, ext)`, `loadImageBuffer(url)` (Vercel Blob).

**Platform:**
- `claude.ts` — OpenRouter client. `MODELS = { sonnet: anthropic/claude-sonnet-4.5,
  haiku: anthropic/claude-haiku-4.5 }`. `chat()` supports vision (content arrays).
- `db.ts` — `getDb()` Neon client.
- `users.ts` — `getOrCreateUser()` (reads NextAuth session → users row).
- `usage.ts` — daily limits + `getUsage`/`canGenerate*`/`consume*`.
- `events.ts` — `logEvent(userId, type, meta)` → `events` table.
- `security.ts` — `limits.*` rate-limiters, input guards.
- `razorpay.ts`, `credits.ts`, `whatsapp.ts`, `scraper.ts`, `analytics.ts`,
  `brand.ts` (sample/demo brand), `cn.ts` (className util).

**Legacy / retired (kept on disk, not in the active path):**
- `imagegen.ts`, `image-brief.ts`, `image-prompt-builder.ts`, `imageplan.ts`,
  `overlay.ts`, `font-data.ts`, `prompts.ts` — the **old** template + code-overlay
  image flow (forbade text in image, drew it with canvas). Superseded by the
  Ideogram native-text flow. `app/api/image/overlay/route.ts` is kept only for
  old chat messages.

---

## 5. Routes — pages & API
### Pages
| Path | Group | Purpose |
|---|---|---|
| `/` | marketing | Landing (animated hero) |
| `/pricing` | marketing | Public pricing |
| `/styleguide` | marketing | Design-token reference |
| `/login`, `/signup` | auth | Email/password + Google |
| `/onboarding` | onboarding | First-run brand capture |
| `/dashboard` | dashboard | "The desk" — chat workspace |
| `/task` | dashboard | **Image Studio** (dual-input) |
| `/library` | dashboard | Gallery of all generated images |
| `/brand` | dashboard | Brand Book (incl. logo upload) |
| `/coach`, `/shipped` | dashboard | Coaching / shipped log |
| `/upgrade` | dashboard | Plans (in-app) |
| `/admin` | admin | Admin dashboard |

### API (`app/api/**/route.ts`)
- **Auth:** `auth/[...nextauth]`, `auth/register`
- **Brand:** `brand` (GET), `brand/create`, `brand/update`, `brand/scrape`
- **Chat:** `chat` (main ad/brief + text flow), `chats`, `chats/[id]`
- **Image:** `image/studio` (dual-input ⭐), `image/generate`, `image/regenerate`,
  `image/overlay` (legacy)
- **Campaign/Post:** `campaign/generate|history|feedback`, `post/generate`,
  `post/image`
- **Payments:** `payment/create-order`, `payment/verify`, `payment/webhook`
- **Misc:** `upload` (multipart → Blob), `usage`, `credits`, `events`, `voice`,
  `whatsapp/reminder`

---

## 6. Database (live tables)
Live tables (Neon, public schema): `users`, `auth_accounts`, `brand_profiles`,
`campaigns`, `posts`, `chats`, `chat_messages`, `generated_images`,
`daily_usage`, `events`, `credit_transactions`, `subscriptions`,
`voice_profiles`, `security_logs`.

Key columns:
- **users** — `id` (uuid PK), `clerk_id` (legacy, UNIQUE), `email`, `name`,
  `image`, `password_hash`, `plan` (`free|starter|pro`), `credits`,
  `ai_messages_today`, `whatsapp_reminder`, `created_at`.
- **auth_accounts** — OAuth links: `user_id`, `provider`, `provider_account_id`
  (UNIQUE).
- **brand_profiles** — one per user (UNIQUE `user_id`): `brand_name`, `product`,
  `target_audience`, `usp`, `platforms[]`, `goal`, `content_style`, `language`,
  `city`, `country`, `brand_colors`, `website`, `role`, `industry`,
  **`logo_url`**, `onboarding_complete`.
- **chats / chat_messages** — conversation history. `chat_messages` carries
  `image_url` + `image_meta` (jsonb, `AdImageMeta`) for generated ads; chats hold
  `pending_brief` (jsonb) for the multi-step brief flow.
- **generated_images** — Image Studio gallery: `user_id`, `url`, `headline`,
  `source` (`studio`), `created_at`. The Library unions this with
  `chat_messages.image_url`.
- **daily_usage** — `(user_id, day)` unique; `post_count`, `image_count`.
- **events** — analytics (`login`, `image_generated`, `limit_hit`, …).
- **credit_transactions / subscriptions** — Razorpay billing (built, MVP-dormant).

> Schema base lives in `lib/schema.sql`; later tables/columns were added via
> `scripts/db-migrate-*.mjs`. To create the gallery table:
> `node scripts/db-migrate-images.mjs`. Logo column was added with an inline
> `ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS logo_url text`.

---

## 7. Core workflows (how everything actually works)
### A. Sign up / sign in
NextAuth v5 (`auth.ts`), JWT sessions. Credentials (bcrypt against
`users.password_hash`) + Google OAuth. OAuth `signIn` callback upserts a `users`
row and links `auth_accounts`. Session carries `user.id`. `getOrCreateUser()`
(`lib/users.ts`) is the server-side entry every API route uses.

### B. Onboarding → Brand Book
Onboarding captures the brand into `brand_profiles`. The Brand Book (`/brand`)
lets the founder edit fields inline and **upload a logo** (`/api/upload` → Blob →
`/api/brand/update { logo_url }`). The brand profile is the context fed into all
copy + image generation.

### C. Chat / ad brief flow (`/api/chat`)
The desk chat. For ad requests it runs a multi-step **brief** (stored in
`chats.pending_brief`): asks mode (if a photo was uploaded) + color, auto-writes
copy, then calls `generateAd`. Generated image + `image_meta` are saved on the
`chat_messages` row so a natural-language edit can regenerate (`editAd`).

### D. Image Studio dual-input (`/api/image/studio`) ⭐ the headline feature
See §8. Textarea is the single source of truth → parse → merge → copy → prompt →
Ideogram → store → save to `generated_images` → return `{ url, copy, debug }`.

### E. Library
`/library` server-component unions `generated_images` (studio) + chat-generated
images (`chat_messages.image_url`), newest first, grid view.

### F. Payments (dormant)
Razorpay order/verify/webhook routes exist; credits/subscriptions tables exist.
**Not active in MVP** — `usage.ts` enforces free daily limits instead.

---

## 8. The image-generation system (deep dive) — the core IP
### Two entry points, one engine
1. **Chat flow** → `generateAd(brand, brief, seed)`
2. **Studio dual-input** → `generateFromDescription(brand, opts, seed)`

Both end in `ad-imagegen.ts`, call Ideogram, re-host the result on Vercel Blob,
log the prompt, and return `GeneratedAd` (now including a `debug` payload).

### The dual-input pipeline (Studio)
```
textarea text  ──parseDescription (Haiku)──▶  ParsedBrief (nulls allowed)
                                               │
brand profile ─────────────────────────────────┤ mergeWithDefaults(seed)
lever seed     ─────────────────────────────────┘
                                               ▼
                                          MergedBrief (all fields concrete)
writeAdCopy (Haiku) ───▶ headline/subhead/cta
                                               ▼
                       buildPromptFromMerged  (or buildStrategeAdPrompt if Stratège)
                                               ▼
                  Ideogram v4 generate  (or remix if exact-product photo)
                                               ▼
                       store on Blob ▶ save to generated_images ▶ return {url, copy, debug}
```

- **9 palettes** (`PALETTES`): brand, indigo_violet, teal_emerald, orange_rose,
  slate_cyan, black_gold, sage_sand, terracotta_cream, navy_silver. Each has
  `name`, `colorA`, `colorB`, and a `description_text` sentence the UI
  appends/removes from the textarea on click.
- **4 styles** (`STYLES`): product_hero, editorial_story, modern_system,
  bold_poster (each with `description_text` + `default_render`).
- **Quick-add chips** (UI): brand colors, logo, today's date, nearest festival.
- **Levers** (`pickLever(seed)`): side, render, font, background — deterministic
  rotation so "make another" varies but a single ad is reproducible.

### Stratège brand locks (self-marketing only) — `brand-locks.ts`
When `isStrategeBrand(brand)` is true (brand name "Stratège"/"stratege" or a
`self_marketing` flag), **6 locks** silently shape output. **User brands are
never affected.**
1. **Colors** — only 3 palettes: cream `#F5F1EA`/`#1D9E75`/`#1A1A1A` (60%),
   green (25%), noir `#0A0C0F`/`#5DCAA5` (15%). Never purple/indigo/neon
   (negative-prompted).
2. **No dashboards/charts** — forces one of 10 concrete hero scenes.
3. **Headline voice** — `writeStrategeCopy` validates against banned patterns
   ("Strategy Made X", "in Minutes Not Days", "Co-Pilot", …) and regenerates;
   curated fallbacks.
4. **Subhead/CTA** — Stratège CTAs only ("Open the desk", "Try it free"…); never
   "Get Started"/"Discover".
5. **Composition** — strict hierarchy rules injected into the prompt.
6. **Specific moments** — always a real founder moment, never an abstract concept.

Verified: 10 seeds stay on-palette, validators catch banned copy, detection
spares user brands, palette distribution ≈ 60/25/15.

### Prompt logging & debug (`prompt-log.ts`)
- `console.log` the full prompt (marked) before every Ideogram call.
- Append prompt + URL + timestamp to `logs/image-prompts.log` (local only, skipped
  on Vercel, gitignored).
- `debug { prompt, parsedFields, mergedFields, levers }` returned from
  `/api/image/studio` and `/api/chat` image responses.
- Collapsible **"Debug: show prompt"** panel in `/task`, shown only in dev or with
  `?debug=true`.

### Ideogram specifics
- Model: **4.0 Turbo**. `generate` endpoint (multipart `text_prompt`,
  `rendering_speed=TURBO`, `aspect_ratio`, `num_images`); `remix` endpoint
  (`image`, `text_prompt`, `image_weight=68`). ~$0.03/image. Native text
  rendering — Ideogram draws all text; **no code overlay**.
- No API key → deterministic placeholder images (so dev never breaks).

---

## 9. External services, APIs & environment variables
| Service | Used for | Env var(s) |
|---|---|---|
| Neon Postgres | database | `DATABASE_URL` |
| OpenRouter (Claude) | all LLM calls | `OPENROUTER_API_KEY` |
| Ideogram | image gen | `IDEOGRAM_API_KEY` |
| Vercel Blob | image hosting | `BLOB_READ_WRITE_TOKEN` |
| Google OAuth | sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| NextAuth | sessions | `NEXTAUTH_URL` (=https://stratege.in in prod), `NEXTAUTH_SECRET` |
| Razorpay | payments (dormant) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| PostHog | analytics | PostHog key (client) |
| Runtime | env detection | `NODE_ENV`, `VERCEL` |

- Secrets live in `.env.local` (gitignored) and Vercel project env. **Never
  commit secrets.** If a secret is exposed, rotate it.
- `claude.ts` calls `https://openrouter.ai/api/v1/chat/completions`.

---

## 10. Auth & security
- **NextAuth v5**, JWT strategy. Credentials provider (bcrypt) + Google (only
  registered when both Google env vars present). `signIn` page = `/login`.
- `users` table holds password hashes; OAuth links in `auth_accounts`
  (`allowDangerousEmailAccountLinking: true`, so same-email Google links to an
  existing account).
- **Security guards** (`lib/security.ts`): rate-limiters (`limits.generation`,
  etc.), input validation (zod on every route), `security_logs` for flagged
  input. Uploads (`/api/upload`): auth + size cap (≤8 MB) + MIME sniff +
  Blob-only. `photoUrl` into image routes is origin-allowlisted (SSRF guard,
  `isAllowedImageUrl`).

---

## 11. Usage limits & billing model
- **MVP: no payments.** `lib/usage.ts`:
  - `posts`: **10/day** text generations.
  - `images`: **unlimited** during MVP (`canGenerateImage` always true).
  - Tracked in `daily_usage (user_id, day)`; `consumePost`/`consumeImage` +1.
  - `MVP_LIMIT_MESSAGE` shown when the post cap is hit (`limit_hit` event logged).
- Razorpay + `credit_transactions` + `subscriptions` are wired but **off**.
  Plans: `free | starter | pro` (enum exists).

---

## 12. Brand identity & design tokens (Tailwind)
- Colors: `ink #171713`, `paper #F5F1E8`, `canvas #FBFAF6`, `strategy` (deep
  `#064B39` + tint), `accent #E8793B` (+ tint), `rule #D8D2C5`, `muted #706D65`.
- Fonts: `font-display` (Fraunces, serif), `font-sans` (Inter), `font-mono`
  (JetBrains Mono).
- Radius/shadow: `rounded-card`/`rounded-artifact`, `shadow-artifact`/`-raised`/
  `-focus`. Helpers: `.label`, `.canvas-grid`.
- **Image-gen brand (self-marketing)** palette is separate and stricter: cream
  `#F5F1EA` / green `#1D9E75` / noir `#0A0C0F` / emerald `#5DCAA5` (see §8).
- Logo = two ascending green chevrons (`components/ui/Logo.tsx`, `#087A55`); PNG/
  SVG exports in `public/stratege-logo*.{svg,png}`.

---

## 13. What is complete ✅
- Landing / pricing / login / signup (faithful design) — live.
- NextAuth email/password + Google — live & verified.
- Brand Book with inline edit + **logo upload**.
- Image Studio **dual-input** generation (9 palettes, 4 styles, chips, parser→
  merger, debug panel).
- **Library** gallery (studio + chat images).
- **Stratège brand locks** (6 locks) for self-marketing.
- **Prompt logging + debug** (console, file, API field, UI panel).
- Ideogram 4.0 Turbo generate + remix; Blob re-hosting; placeholder fallback.
- Usage limiting (posts 10/day; images unlimited MVP).

---

## 14. What is pending / known gaps 🚧
- **Inner-app faithful redesign** — dashboard/desk, brand book, onboarding still
  need the source design treatment (large, multi-session).
- **Real logo compositing** — the "+ My logo" chip only *tells* Ideogram to draw
  a logo; it does **not** overlay the user's actual uploaded logo file. Needs a
  post-generation Canvas/sharp overlay step.
- **Payments** — Razorpay built but not switched on; limits substitute for now.
- **Password reset / email verification** — not implemented (optional).
- **Authenticated-screen visual QA** — needs a real login; not done by the agent.
- **Variations** — Studio generates 1 image/credit (mockup implied 3); making it
  produce 3 variations would 3× Ideogram cost.
- **Legacy code** — old overlay flow (`lib/overlay.ts`, `imagegen.ts`, etc.) and
  `clerk_id`/`@clerk/nextjs` residue can be removed eventually.

---

## 15. "What if" — edge cases & failure modes
- **No `IDEOGRAM_API_KEY`** → placeholder images (picsum-style), `fallback:true`.
  Generation never throws.
- **No `OPENROUTER_API_KEY`** → copy/parse calls fail → fall back to curated /
  default copy (`fallbackCopy`, parser returns text as `extra_notes`).
- **Haiku returns non-JSON** → parser/merger swallow and use defaults; copy uses
  fallback. Never crashes the request.
- **Stratège copy keeps coming back generic** → `writeStrategeCopy` retries up to
  3×, then uses curated on-brand headline/subhead/CTA.
- **Vercel read-only FS** → `logPromptFile` is skipped (`process.env.VERCEL`);
  console log + DB still work.
- **Image too large on upload** → rejected (>8 MB) before Blob.
- **Daily post cap hit** → 429 + `MVP_LIMIT_MESSAGE`; images uncapped.
- **OAuth same email** → links to existing user (no duplicate account).
- **Edit an old chat image** → `image_meta` on the message lets `editAd` reuse
  product/mode/lever with patched copy.

---

## 16. Deploy workflow
1. Work on a branch off `main` (or `main` directly for this MVP).
2. `npm run lint` → `npm run build` (must be clean — `tsc` typechecks the whole
   project).
3. `git commit` (sign-off line: `Co-Authored-By: Claude Opus 4.8 …`).
4. `git push origin main` → **Vercel auto-deploys to stratege.in** (~1–2 min).
5. DB changes: write/run a `scripts/db-migrate-*.mjs` against Neon
   (`set -a && . ./.env.local && set +a && node scripts/<migration>.mjs`).
   Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT
   EXISTS`).

---

## 17. Conventions — how to work in this repo
- **Windows + PowerShell primary**, Bash tool available for POSIX. Git Bash for
  unix-y scripts.
- **Always** `npm run lint && npm run build` before committing. Build = source of
  truth for type correctness (no separate `tsc`).
- Validate every API input with **zod**. Auth via `getOrCreateUser()`.
- Reuse helpers — don't duplicate `resolveBrandColor`, `storeImage`,
  `loadImageBuffer`, `consumeImage`, `logEvent`, `pickLever`.
- **Extend, don't replace** existing flows (the dual-input studio was added
  alongside the chat flow, not over it).
- Image routes are `runtime = "nodejs"` (need `sharp`/Buffer/Blob).
- Keep secrets out of git; `.env.local` and `/logs/` are gitignored.
- When you change something here, **update brain.md**.

---

## 18. Glossary
- **Brief** — the structured spec for an ad (chat flow: `AdBrief`; studio:
  `ParsedBrief` → `MergedBrief`).
- **Lever** — a rotated design choice (side/render/font/bg) seeded
  deterministically.
- **Lookalike vs Exact** — `lookalike` = generate a stylized product from a
  vision description; `exact` = Ideogram **remix** keeps the real uploaded
  product photo.
- **Brand lock** — a Stratège-self-marketing constraint (`brand-locks.ts`).
- **The desk** — the chat workspace (`/dashboard`).
- **Self-marketing** — Stratège generating ads for *itself* (locks apply).

---

*End of brain.md — keep it true to the code.*
