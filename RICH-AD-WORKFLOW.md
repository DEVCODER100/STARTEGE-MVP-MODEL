# 🎮 Rich Ad Workflow — Ideogram renders the whole poster

> The "old workflow" restored: for **product / user brands**, Ideogram natively
> draws the entire ad — big headline, subhead, a 3-item check-list, the product
> photo, a brand wordmark, and a CTA pill — like the Razer posters.
>
> Scope: **product/user brands only.** Stratège's OWN ads stay on the
> deterministic Sharp text path (Ideogram kept cutting that text off-canvas).

---

## What it produces
A bold, full-canvas vertical poster (1:1 / 4:5), all text rendered by Ideogram:
- **Massive headline** (1–2 lines)
- **Subheadline**
- **3-item checklist**, each with a small filled circular check badge
- **Product** shown large and photorealistic in the lower half
- **Brand wordmark** logo in a corner
- **CTA pill** button
- Brand-colored background with a subtle diagonal light streak

Verified example (brand = "Razer"): headline `LEVEL UP YOUR GAME`, subhead
`Pro-grade gear. Competitive edge. Razer precision.`, bullets
`Lightning-Fast Response / Tournament-Grade Performance / Immersive Precision
Gaming`, CTA `Shop Now`.

---

## The workflow (step by step)
```
USER INPUT (Image Studio text  OR  chat Create-mode brief)
        │
        ▼
parse + merge  →  colors / side / render / font / background (brand-aware)
        │
        ▼
writeAdCopy   →  { headline, subhead, cta }      (lib/ad-copy.ts)
writeBullets  →  3 short feature points          (lib/ad-copy.ts)
        │
        ▼
buildRichAdPrompt(...)   →  the full-poster prompt   (lib/ad-prompt-builder.ts)
        │
        ▼
Ideogram 4.0 Turbo  generate  (or remix if a real product photo is attached)
        │
        ▼
re-host on Vercel Blob  →  save to Library  →  return { url, copy, debug }
```

No Sharp text overlay on this path — **Ideogram renders all of it**.

---

## The prompt template (`buildRichAdPrompt`)
```
A bold, premium, full-canvas vertical social-media advertisement poster for {product}.
Massive bold {font} headline at the top reading "{HEADLINE}" (may break into two lines).
Smaller subheadline directly below reading "{SUBHEAD}".
A vertical checklist of 3 short items, each preceded by a small filled circular check badge in {colorB}, reading:
"✓ {bullet 1}"
"✓ {bullet 2}"
"✓ {bullet 3}"
{product} shown large and photorealistic in the lower portion of the poster, {render}.
A solid rounded pill CTA button near the bottom reading "{CTA}".
A small "{brandName}" brand wordmark logo in a bottom corner.
{bg} background in {colorA} and {colorB}, with a subtle bold diagonal light streak.
High-contrast, premium, magazine-grade, crisp typography, social-media ready, ready to post.
All text stays within 5% padding from every canvas edge. No text touches or crosses edges.
```
- The checklist line is **omitted** if no bullets are produced (graceful fall-back
  to a clean headline/subhead/CTA poster).
- For a **remix** (real uploaded product photo) the subject line becomes
  "Keep the provided product object exactly as it is…" so the real product is kept.
- `{colorA}/{colorB}` come from the brand colors (or the chosen palette); the check
  badges use the accent. Levers (`render`, `font`, `bg`) rotate off the seed.

---

## Copy generation
- **`writeAdCopy`** (Haiku) → `{headline (2–5 words), subhead, cta}`.
- **`writeBullets`** (Haiku) → exactly 3 bullets, each 1–3 words, concrete product
  strengths (e.g. "All-day battery", "Tournament-grade"). Returns `[]` on failure
  → the checklist is simply dropped.

---

## Where it runs
| Entry point | Function | Path |
|---|---|---|
| Image Studio (`/task`) | `generateFromDescription` | user brand → `buildRichAdPrompt` |
| Chat **Create mode** (`/api/chat`) | `generateAd` | user brand → `buildRichAdPrompt` |

Stratège self-marketing (brand name "Stratège" / `self_marketing`) is intercepted
**before** this and routed to the deterministic Sharp text overlay instead.

## Key files
- `lib/ad-prompt-builder.ts` — `buildRichAdPrompt`
- `lib/ad-copy.ts` — `writeAdCopy`, `writeBullets`
- `lib/ad-imagegen.ts` — `generateAd`, `generateFromDescription` (routing)
- `lib/ideogram.ts` — Ideogram 4.0 Turbo client (generate + remix)

## Tuning knobs
- Headline length: `HEADLINE_FULL` in `lib/prompt-constants.ts` (2–5 words).
- Bullet count/voice: `BULLETS_SYSTEM` in `lib/ad-copy.ts`.
- Poster styling (streak, logo, layout wording): the template in `buildRichAdPrompt`.
- See any prompt live: dev terminal, `logs/image-prompts.log`, or `?debug=true` in
  the Image Studio.
