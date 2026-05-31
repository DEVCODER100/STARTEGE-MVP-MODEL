import type { CreativeDirection } from "./creative-direction";
import {
  TEMPLATE_LAYOUT_DIRECTIVE,
  TEMPLATE_SUBJECT,
  type ImageBrief,
} from "./image-brief";

// Replaces the loose scene_prompt assembly that used to live in
// lib/imagegen.ts. The output is a structured creative brief — explicit
// SUBJECT, LAYOUT, HIERARCHY, MOOD, COLOR, NEGATIVE sections — so two
// startups with the same template still get visibly different Ideogram
// images, and the SAME startup never gets stuck on one stock subject.

export function buildIdeogramPrompt(
  brief: ImageBrief,
  brand: Record<string, unknown>,
  direction: CreativeDirection
): string {
  if (!brief.template) {
    throw new Error("buildIdeogramPrompt: brief.template is required");
  }
  const t = brief.template;

  const productCategory = String(
    brand.industry ?? brand.product ?? "startup product"
  ).slice(0, 120);
  const audience = String(brand.target_audience ?? "target users").slice(0, 120);
  const positioning = String(brand.usp ?? brand.goal ?? "clear value").slice(0, 160);

  return `RAW IMAGE ONLY - NO DESIGN TEXT

SUBJECT
${TEMPLATE_SUBJECT[t]}.

CONTEXT FOR MOOD ONLY
Product category: ${productCategory}
Audience: ${audience}
Positioning: ${positioning}
Use this context only to choose the scene, materials, people, lighting, and mood.
Do not write, spell, print, display, label, or imply any brand name, product name, slogan, caption, UI text, social handle, or marketing sentence inside the image.

${TEMPLATE_LAYOUT_DIRECTIVE[t]}

HIERARCHY
One clear hero focal point. This is the raw visual layer only, not the finished ad. The image must not crowd the area where the overlay headline and CTA will sit. Avoid busy collages and avoid framing the subject dead-center if the layout above implies an off-center composition.

TYPOGRAPHY / MOOD
Visual style: ${direction.style}. Energy: ${direction.energy}. Treatment: ${direction.imageTreatment}. Subject hint: ${direction.subjectHint}. Identity should feel native to ${direction.platform}.

COLOR USAGE
Lead with the brand accent ${direction.palette.accent}. Background bias ${direction.palette.bg}. Use the accent through lighting, props, wardrobe or surface tints — never as a flat colored wash, unless the layout above explicitly calls for a solid-color field. Avoid neon over-saturation.

NEGATIVE
No text. No letters. No numbers. No logos. No captions. No watermarks. No UI chrome, app icons, social media UI, labels, signs, sticky notes with writing, whiteboards, posters, paper sheets with writing, badges, buttons, fake websites, fake mobile apps, fake dashboards with words, or ad copy. Do not design a full advertisement. Do not make a split-screen layout. If a phone, laptop, or dashboard appears, the screen must be blank or use abstract non-readable shapes only. Purely visual. No generic "person at laptop" stock scene unless that is literally the subject above. No cluttered desktops, no scattered objects, no random hands holding random props.

QUALITY
Ultra high quality, crisp, professional, social-feed-ready, magazine-grade lighting.`;
}
