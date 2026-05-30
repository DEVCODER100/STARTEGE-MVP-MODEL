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

  return `SUBJECT
${TEMPLATE_SUBJECT[t]}.

STARTUP CONTEXT
Brand: ${String(brand.brand_name ?? "(unspecified)")}
Product: ${String(brand.product ?? "the product")}
Audience: ${String(brand.target_audience ?? "the target audience")}
Industry: ${String(brand.industry ?? "startup")}
Positioning: ${String(brand.usp ?? brand.goal ?? "clear value")}
Founder tone: ${String(brand.content_style ?? "professional but warm")}

${TEMPLATE_LAYOUT_DIRECTIVE[t]}

HIERARCHY
One clear hero focal point. The image must not crowd the area where the overlay headline and CTA will sit. Avoid busy collages and avoid framing the subject dead-center if the layout above implies an off-center composition.

TYPOGRAPHY / MOOD
Visual style: ${direction.style}. Energy: ${direction.energy}. Treatment: ${direction.imageTreatment}. Subject hint: ${direction.subjectHint}. Identity should feel native to ${direction.platform}.

COLOR USAGE
Lead with the brand accent ${direction.palette.accent}. Background bias ${direction.palette.bg}. Use the accent through lighting, props, wardrobe or surface tints — never as a flat colored wash, unless the layout above explicitly calls for a solid-color field. Avoid neon over-saturation.

NEGATIVE
No text. No letters. No numbers. No logos. No captions. No watermarks. No UI chrome, app icons, or signage. Purely visual. No generic "person at laptop" stock scene unless that is literally the subject above. No cluttered desktops, no scattered objects, no random hands holding random props.

QUALITY
Ultra high quality, crisp, professional, social-feed-ready, magazine-grade lighting.`;
}
