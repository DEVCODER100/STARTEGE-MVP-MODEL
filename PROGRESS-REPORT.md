# Stratege — Progress Report

_Generated: 2026-06-15_

## What this project is
**Stratege** — a Next.js marketing-content app. The core feature under active
work is the **AI image generation pipeline**: a user asks for a marketing image,
answers a short creative brief, and gets a finished social-ready creative
(Ideogram generates a text-free visual, then the code composites the
headline/CTA text on top).

---

## The current flow (as built)
1. User message → `app/api/chat/route.ts` detects an image request (keyword
   match, else a Haiku classifier).
2. **3-question creative brief** in fixed order: **template → color → hook**
   (`lib/image-brief.ts:142`).
3. Brief complete → `generateMarketingImageFromBrief` (`lib/imagegen.ts:96`)
   builds a structured Ideogram prompt (`lib/image-prompt-builder.ts`),
   generates the base image, then overlays text.
4. Overlay layout is **forced** by the chosen template via `TEMPLATE_TO_OVERLAY`
   → `compositeText(..., forceTemplate)` (`lib/overlay.ts:750`).
5. A recommended post caption is generated and returned alongside the image.

---

## Progress / what's been fixed recently
- ✅ Replaced direct image-gen with the 3-question brief flow (`b263330`)
- ✅ Fixed the original "template collapsed to one template" bug (`0d73061`) —
  `selectTemplate` no longer intersects with a platform list that shrank the
  pool to one
- ✅ Gave each template a distinct visual language + forced overlay layout
- ✅ Template previews now shown before generation (`1d7970d`)
- ✅ Prevent Ideogram text from corrupting overlays (`3c829af`)
- ✅ Fixed testimonial overlay route (`91587f4`)
- ✅ Per-image caption (`e3a0ec2`)

**Working tree is clean** — no uncommitted code changes (only untracked
`npm-cache/`, `tmp/`, `public/found.html`, `public/found.png`).

---

## The "same template / same image every time" problem — root cause
The earlier *overlay-layout* collapse is fixed, but the deeper reason images
still look the same per template is in the **brief path itself**:

1. **Deterministic Ideogram prompt.** `generateMarketingImageFromBrief`
   deliberately **skips the Claude `planImage` call** and builds the prompt
   purely from static maps — `TEMPLATE_SUBJECT` + `TEMPLATE_LAYOUT_DIRECTIVE`
   (`lib/image-brief.ts:102-140`). For a given startup + template, the prompt
   text is **identical every time**. The only variation is Ideogram's internal
   random seed → so images look near-identical. Comment at
   `lib/imagegen.ts:118` even says "we keep it deterministic."

2. **8 templates → only 5 overlay layouts.** `TEMPLATE_TO_OVERLAY`
   (`lib/image-brief.ts:75`) collides:
   - `educational` & `feature_update` → both `editorial`
   - `testimonial` & `founder_story` → both `frame`
   - `announcement` & `milestone` → both `poster`

   So different template choices can still produce the same layout.

3. **`forceTemplate` bypasses the anti-repeat rotation.** `selectTemplate`
   (`lib/overlay.ts:754`) has anti-repeat logic, but when `force` is set it
   returns immediately — so back-to-back images on the same template never vary
   the layout.

---

## Fix options for the template problem
To actually get variety per template, the highest-leverage changes:

- **Add a varying seed/variant** into the Ideogram prompt (e.g. rotate
  `subjectHint`, a per-generation seed, or re-enable a light `planImage` call)
  so the same template + startup yields different scenes.
- **Within a forced overlay template, vary sub-layout** (image-on-top vs
  bottom, accent rhythm) instead of returning early on `force`.
- Optionally **give each of the 8 brief templates its own distinct overlay
  layout** instead of collapsing to 5.

**Recommendation:** option 1 + a small variant rotation inside the forced
template — gives visible variety without breaking the deterministic, on-brand
intent.

---

## Key files
| File | Role |
|------|------|
| `app/api/chat/route.ts` | Chat + image/brief orchestration |
| `lib/image-brief.ts` | Brief state machine, templates, hooks, captions |
| `lib/image-prompt-builder.ts` | Builds the structured Ideogram prompt |
| `lib/imagegen.ts` | Full image pipeline (gen → overlay → store) |
| `lib/overlay.ts` | Canvas text compositing + template layouts |
