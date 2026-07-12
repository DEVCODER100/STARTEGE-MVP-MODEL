# Stratège UI/UX Audit

Date: June 22, 2026  
Audited: `https://stratege.in/` plus the current repository screens and components.

## Honest verdict

Stratège is clean, readable, and calmer than many AI products. It is not ugly. The problem is that it currently feels assembled from familiar SaaS ingredients:

- centered serif headline;
- green italic emphasis;
- dot-grid background;
- white cards with thin gray borders;
- rounded pills;
- a sidebar plus ChatGPT-like conversation;
- generic “three steps” marketing section.

Those choices are individually good, but together they do not create a recognizable product identity. Someone could replace the logo and copy and the design would still work for dozens of AI startups.

The redesign should not chase more gradients, glassmorphism, or random animation. It needs a stronger product metaphor, more visible proof, more purposeful composition, and interaction patterns that belong specifically to Stratège.

## The strongest design direction

### “The Strategy Desk”

Stratège should feel like entering a sharp creative strategist’s working desk.

The chat is only the conversation layer. The real product is the collection of briefs, decisions, drafts, campaign assets, publishing plans, and outcomes created during that conversation.

Use three persistent concepts:

1. **Conversation** — what the founder asks.
2. **Working canvas** — the strategy, post, ad, or campaign being built.
3. **Proof trail** — why Stratège made each recommendation and what happened after publishing.

This creates a product that feels more intelligent than a blank chatbot and more useful than a content generator.

## Immediate trust problems

1. `/pricing` currently displays only the word “Pricing” on a blank page.
2. `/upgrade` is also only a heading.
3. `GuidedEditor` is a placeholder.
4. The landing page shows only a static, simplified mock product. It does not prove the richer chat, image, campaign, and editing capabilities that already exist.
5. The visual language is nearly identical across landing, authentication, onboarding, and the app. Every screen becomes a white canvas with a bordered card.
6. The product claims personalization, but the UI rarely exposes the user’s brand memory or shows how it affects an answer.
7. The current chat modes—Coach, Strategy, Create—look like small tabs rather than meaningfully different workflows.

Fix the empty and placeholder routes before adding visual spectacle. They damage confidence more than a modest visual design does.

## Landing page redesign

### 1. Replace the generic hero with an interactive transformation

Use an asymmetrical hero:

- Left: a concise promise and CTA.
- Right: a live “strategy desk” demonstration.

Suggested headline:

> Your business already has stories. Stratège turns them into marketing.

Suggested supporting line:

> Tell Stratège what happened today. Leave with the post, visual, campaign angle, and next move—shaped around your actual brand.

The demonstration should animate through one believable sequence:

1. Founder types: “We packed our first 100 orders today.”
2. Stratège extracts the moment and presents three angles.
3. The user chooses “behind the scenes.”
4. A finished reel script, caption, visual direction, and publishing time assemble on the canvas.
5. A small explanation appears: “Recommended because your audience responds to founder-led stories.”

This communicates the product in 10–15 seconds without a generic dashboard screenshot.

### 2. Build the page around proof, not feature cards

Recommended section order:

1. Hero transformation.
2. “From one sentence to a week of marketing” interactive example.
3. Real output gallery with before/after context.
4. Brand-memory section showing what Stratège remembers.
5. Three workflow stories: launch, daily posting, and paid ad.
6. Customer proof or honest private-beta signals.
7. Pricing.
8. Final CTA.

Avoid a grid of six equal feature cards. Use editorial storytelling with varied scale.

### 3. Make output examples feel real

Each example should include:

- the founder’s original messy input;
- the business type and city;
- the final asset;
- one sentence explaining the strategic choice;
- a measurable result when available.

Even private-beta proof such as “posted in 4 minutes” is stronger than vague claims.

### 4. Add an unmistakable signature motif

Use a “strategy annotation” motif throughout the site:

- fine green editorial marks;
- margin notes;
- underlined phrases;
- numbered decisions;
- small “why this” callouts;
- connecting lines between an input and the output it influenced.

This should feel like a strategist marking up a creative brief, not decorative AI sparkles.

### 5. Improve the mobile hero

The current mobile hero is readable, but the product preview begins below the first viewport and the copy occupies most of the screen.

On mobile:

- shorten the headline to 4–6 lines maximum;
- show a compact output artifact immediately below the primary CTA;
- move the secondary CTA to a text link;
- keep one clear CTA;
- reduce the empty vertical space above the demonstration.

## Product redesign

## Dashboard / chat

### Current problem

The current empty state is a centered greeting, suggestion pills, and a composer. This is the most common AI product layout in the market.

### Recommended structure

Use a three-zone workspace on desktop:

- **Left rail:** projects, recent work, and saved campaigns.
- **Conversation column:** compact dialogue and clarification.
- **Artifact canvas:** the current strategy, post, image, or plan.

The artifact canvas should become the visual center. Chat should be narrower and feel like the way users direct the work.

On mobile, conversation and canvas become two swipeable or tabbed views: **Talk** and **Work**.

### Replace modes with jobs

“Coach / Strategy / Create” describes the AI, not the user’s goal. Replace or supplement them with:

- Plan a campaign
- Make today’s post
- Create an ad
- Review my content
- Find my next move

Each job should open a distinct workspace template and produce a visible artifact.

### Give every response structure

Avoid long assistant paragraphs. Responses should assemble into blocks such as:

- Recommendation
- Why this fits your brand
- Draft
- Visual direction
- Next action
- Alternatives

Let users edit these blocks directly without entering a separate form.

### Make brand memory visible

Add a small, collapsible “Using from your brand” strip:

- audience;
- tone;
- location;
- goal;
- preferred platform;
- product photo;
- brand colors.

Allow the user to remove or override any item for the current request. This makes personalization believable and controllable.

### Make suggestions contextual

Replace generic prompt chips with a daily briefing:

- a relevant opportunity;
- a business milestone worth posting;
- one suggested task;
- one reason it matters today.

Generic prompts can remain under “More ideas.”

## Campaign and content output

Turn generated content into an editable artifact rather than a chat attachment.

Recommended canvas:

- title and status at the top;
- platform preview;
- hook, caption, CTA, hashtags, and visual as editable blocks;
- “Why this works” in a margin note;
- version history;
- regenerate only the selected block;
- export/copy controls grouped in one publishing bar;
- posted/result feedback after publishing.

Add a before/after toggle when editing generated visuals. Do not charge a full regeneration merely to fix a word if the overlay can be edited locally.

## Image-generation flow

The current brief questions are useful, but option pills inside a chat can feel procedural.

Use a small visual creative board:

- show three genuinely distinct art directions;
- display palette, composition, typography mood, and example crop;
- let the user mix elements from different directions;
- explain what will remain on-brand;
- show image credit cost before generation.

During generation, replace the generic spinner checklist with a “creative assembly” animation: brief fragments visibly flow into composition, image, headline, and final export. Keep it under control and respect reduced-motion settings.

## Onboarding

Twelve sequential questions feel longer than the copy suggests.

Recommended flow:

1. Import website or Instagram.
2. Show the extracted brand profile on one review screen.
3. Ask only missing or uncertain details.
4. Generate a first useful artifact during onboarding.
5. Let the user correct their brand profile later.

Group manual questions into 3 chapters:

- Business
- Audience and goals
- Voice and visual identity

Show meaningful progress (“Business complete”) instead of twelve small dots.

Do not auto-advance immediately after every choice. Auto-advance can feel jumpy and makes correction harder. Use it only for obvious single-choice steps and include an undo affordance.

## Brand profile

The current profile is a read-only table followed by “Re-run onboarding.”

Redesign it as a living brand book:

- brand summary;
- audience cards;
- voice sliders with example phrases;
- words to use / avoid;
- visual palette and typography;
- content pillars;
- approved product images;
- platform preferences;
- edit controls per section;
- “What Stratège learned recently” with approval.

This page can become one of the product’s strongest differentiators.

## Pricing and upgrade

Build these before public promotion.

Pricing should explain value in product language:

- conversations/strategy;
- generated visuals;
- brand profiles;
- campaign history;
- export resolution;
- support;
- usage limits.

Avoid three arbitrary SaaS tiers if only one paid plan is meaningful. A clear free beta plus one Pro plan and optional credit packs is credible.

Show current usage inside the app and explain what consumes a credit before users encounter a limit.

## Authentication

The auth pages are clean but anonymous.

Use a split layout on desktop:

- form on one side;
- rotating real output and a short customer story on the other.

On signup, promise the immediate outcome:

> Create your brand profile and leave with your first ready-to-post idea.

Keep sign-in simpler than signup; it does not need decorative complexity.

## Visual system

### Keep

- the dark ink plus green palette;
- Fraunces as a selective editorial voice;
- generous whitespace;
- restrained borders;
- clear, plain-language copy.

### Change

- Stop placing almost everything inside the same rounded white card.
- Use more composition: columns, rules, annotations, crop, overlap, and intentional asymmetry.
- Reserve Fraunces for high-emotion or strategic phrases, not every major title.
- Replace the page-wide dot grid with localized working-canvas grids or paper textures.
- Introduce one warm supporting color such as saffron, coral, or ochre for human energy and status—not another blue-purple AI gradient.
- Create stronger contrast between marketing pages, the working app, and utility screens.

### Suggested palette

- Ink: `#171713`
- Paper: `#F5F1E8`
- Canvas: `#FBFAF6`
- Strategy green: `#087A55`
- Deep green: `#064B39`
- Human accent: `#E8793B`
- Rule: `#D8D2C5`
- Muted text: `#706D65`

Use pure white sparingly for raised artifacts.

### Typography

- Display: Fraunces or another characterful serif, used selectively.
- UI/body: a neutral grotesk such as Inter, Geist, or Suisse-like alternative.
- Artifact labels: a compact mono or technical sans for metadata only.

The typography should distinguish editorial messaging, product controls, and generated artifacts.

## Motion direction

Motion should explain transformation.

Use:

- shared-element transitions from a chat request into an artifact;
- text blocks assembling in a deliberate sequence;
- subtle line-drawing annotations;
- canvas panels sliding or expanding from the selected recommendation;
- tactile button compression and selection states;
- a calm page transition using paper/canvas layers.

Avoid:

- constant floating blobs;
- glowing cursor effects;
- every card fading upward;
- animated gradients;
- excessive parallax;
- AI sparkle particles.

Timing guidance:

- micro-interactions: 120–180 ms;
- panel transitions: 240–360 ms;
- narrative demo: 8–15 seconds total;
- use spring motion only for direct manipulation;
- support `prefers-reduced-motion`.

## Accessibility and UX quality

- Ensure all green text meets contrast requirements on light backgrounds.
- Make focus rings visible and consistent.
- Do not rely only on color for selected pills.
- Provide labels for icon-only controls.
- Preserve drafts automatically and show saved state.
- Make destructive chat deletion undoable instead of using a browser confirm dialog.
- Ensure mobile controls are at least 44 px high.
- Use skeletons that preserve final layout rather than a centered spinner.
- Explain errors with a recovery action.

## Priority plan

### Phase 1 — credibility

1. Complete pricing and upgrade.
2. Remove placeholders.
3. Redesign landing hero around a real transformation.
4. Add real output examples and proof.
5. Tighten mobile hero.

### Phase 2 — differentiation

1. Build the conversation + artifact canvas.
2. Make brand memory visible.
3. Replace generic modes with job-based workflows.
4. Redesign generated output as editable blocks.
5. Turn Brand Profile into a living brand book.

### Phase 3 — delight

1. Add the strategy-annotation motion language.
2. Add version history and partial regeneration.
3. Add daily briefing and contextual opportunities.
4. Add result tracking and learning loops.
5. Create a polished onboarding-first-output moment.

## The standard to use

Do not ask, “Does this look modern?”

Ask:

- Could this screen belong to another AI product if the logo changed?
- Does the UI visibly demonstrate strategic thinking?
- Is the user’s business context present on the screen?
- Is the output the hero, or is the chat UI the hero?
- Does motion explain how raw context becomes finished work?
- Does every decorative choice reinforce “a strategist’s working desk”?

If the answer is no, simplify or redesign it.
