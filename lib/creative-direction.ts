export type VisualStyle =
  | "premium"
  | "modern_saas"
  | "minimal"
  | "aesthetic"
  | "bold"
  | "luxury"
  | "editorial"
  | "corporate"
  | "futuristic"
  | "gen_z"
  | "dark_mode"
  | "startup_clean"
  | "apple_minimal"
  | "stripe_saas";

export type CreativePlatform =
  | "instagram"
  | "linkedin"
  | "twitter"
  | "facebook"
  | "youtube"
  | "threads"
  | "website";

export type CreativeLayout =
  | "editorial_card"
  | "split_product"
  | "hero_device"
  | "bold_poster"
  | "minimal_luxury"
  | "social_burst";

export interface CreativeDirection {
  style: VisualStyle;
  platform: CreativePlatform;
  layout: CreativeLayout;
  palette: {
    bg: string;
    bgEdge: string;
    text: string;
    muted: string;
    accent: string;
    pillFill: string;
    pillText: string;
  };
  typography: "quiet" | "editorial" | "bold" | "luxury" | "dense";
  energy: "calm" | "premium" | "energetic" | "technical" | "playful";
  imageTreatment: "product_card" | "device_mockup" | "lifestyle" | "cinematic" | "abstract_3d";
  subjectHint: string;
}

export const STYLE_LABELS: Record<VisualStyle, string> = {
  premium: "Premium",
  modern_saas: "Modern SaaS",
  minimal: "Minimal",
  aesthetic: "Aesthetic",
  bold: "Bold",
  luxury: "Luxury",
  editorial: "Editorial",
  corporate: "Corporate",
  futuristic: "Futuristic",
  gen_z: "Gen Z",
  dark_mode: "Dark mode",
  startup_clean: "Startup clean",
  apple_minimal: "Apple-style minimal",
  stripe_saas: "Stripe-style SaaS",
};

export const PLATFORM_LABELS: Record<CreativePlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
  youtube: "YouTube",
  threads: "Threads",
  website: "Website",
};

const STYLE_ALIASES: Array<[VisualStyle, RegExp]> = [
  ["apple_minimal", /\b(apple|apple[- ]style|minimal premium|premium minimal|clean luxury)\b/i],
  ["stripe_saas", /\b(stripe|stripe[- ]style|saas clean|clean saas)\b/i],
  ["modern_saas", /\b(modern saas|saas|productivity|dashboard|b2b)\b/i],
  ["startup_clean", /\b(startup clean|startup|founder|builder|indie)\b/i],
  ["dark_mode", /\b(dark|dark mode|black|midnight)\b/i],
  ["futuristic", /\b(futuristic|ai|cyber|neon|future)\b/i],
  ["luxury", /\b(luxury|high[- ]end|premium consumer|elite)\b/i],
  ["bold", /\b(bold|energetic|high energy|sport|fitness|strong)\b/i],
  ["gen_z", /\b(gen z|gen-z|playful|youth|vibrant)\b/i],
  ["corporate", /\b(corporate|enterprise|professional|business)\b/i],
  ["editorial", /\b(editorial|magazine|publication)\b/i],
  ["aesthetic", /\b(aesthetic|soft|beautiful|clean girl)\b/i],
  ["minimal", /\b(minimal|minimalist|simple)\b/i],
  ["premium", /\b(premium|polished)\b/i],
];

const PLATFORM_ALIASES: Array<[CreativePlatform, RegExp]> = [
  ["linkedin", /\b(linkedin|b2b|professional)\b/i],
  ["instagram", /\b(instagram|ig|reel|post|story)\b/i],
  ["twitter", /\b(twitter|x\.com|\bx\b|tweet)\b/i],
  ["facebook", /\b(facebook|fb)\b/i],
  ["youtube", /\b(youtube|thumbnail|shorts)\b/i],
  ["threads", /\b(threads)\b/i],
  ["website", /\b(website|landing page|hero)\b/i],
];

export function detectStyle(input: string, brand: Record<string, unknown>): VisualStyle {
  const blob = [
    input,
    brand.content_style,
    brand.industry,
    brand.product,
    brand.target_audience,
    brand.goal,
  ]
    .filter(Boolean)
    .join(" ");

  for (const [style, rx] of STYLE_ALIASES) {
    if (rx.test(blob)) return style;
  }

  const product = String(brand.product ?? "").toLowerCase();
  const industry = String(brand.industry ?? "").toLowerCase();
  if (/\b(ai|saas|software|app|platform|tool|automation|dashboard)\b/.test(product + " " + industry)) {
    return "modern_saas";
  }
  if (/\b(fitness|gym|sport|health)\b/.test(product + " " + industry)) return "bold";
  if (/\b(jewellery|watch|luxury|premium|skincare|fashion)\b/.test(product + " " + industry)) {
    return "luxury";
  }
  return "startup_clean";
}

export function detectPlatform(input: string, brand: Record<string, unknown>): CreativePlatform {
  const blob = [input, Array.isArray(brand.platforms) ? brand.platforms.join(" ") : brand.platforms]
    .filter(Boolean)
    .join(" ");

  for (const [platform, rx] of PLATFORM_ALIASES) {
    if (rx.test(blob)) return platform;
  }
  const platforms = Array.isArray(brand.platforms) ? brand.platforms : [];
  if (platforms.includes("linkedin")) return "linkedin";
  if (platforms.includes("instagram")) return "instagram";
  if (platforms.includes("youtube")) return "youtube";
  if (platforms.includes("facebook")) return "facebook";
  return "instagram";
}

export function makeCreativeDirection(
  brand: Record<string, unknown>,
  request: string,
  overrides?: Partial<Pick<CreativeDirection, "style" | "platform">>
): CreativeDirection {
  const style = overrides?.style ?? detectStyle(request, brand);
  const platform = overrides?.platform ?? detectPlatform(request, brand);

  const styleBase = styleProfiles[style];
  const platformBase = platformProfiles[platform];

  return {
    style,
    platform,
    layout: platformBase.preferredLayout ?? styleBase.layout,
    palette: styleBase.palette,
    typography: platformBase.typography ?? styleBase.typography,
    energy: styleBase.energy,
    imageTreatment: styleBase.imageTreatment,
    subjectHint: styleBase.subjectHint,
  };
}

const styleProfiles: Record<
  VisualStyle,
  Omit<CreativeDirection, "style" | "platform">
> = {
  premium: {
    layout: "minimal_luxury",
    palette: luxuryPalette(),
    typography: "luxury",
    energy: "premium",
    imageTreatment: "cinematic",
    subjectHint: "premium product photography, calm negative space, polished materials",
  },
  modern_saas: {
    layout: "hero_device",
    palette: saasPalette(),
    typography: "editorial",
    energy: "technical",
    imageTreatment: "device_mockup",
    subjectHint: "clean SaaS interface, dashboard fragments, subtle productivity workspace",
  },
  minimal: {
    layout: "minimal_luxury",
    palette: minimalPalette(),
    typography: "quiet",
    energy: "calm",
    imageTreatment: "product_card",
    subjectHint: "minimal product scene, lots of negative space, simple props",
  },
  aesthetic: {
    layout: "editorial_card",
    palette: aestheticPalette(),
    typography: "editorial",
    energy: "calm",
    imageTreatment: "lifestyle",
    subjectHint: "soft editorial lifestyle image, tasteful props, warm natural light",
  },
  bold: {
    layout: "bold_poster",
    palette: boldPalette(),
    typography: "bold",
    energy: "energetic",
    imageTreatment: "lifestyle",
    subjectHint: "dynamic action-oriented scene, strong contrast, confident energy",
  },
  luxury: {
    layout: "minimal_luxury",
    palette: luxuryPalette(),
    typography: "luxury",
    energy: "premium",
    imageTreatment: "cinematic",
    subjectHint: "cinematic premium product scene, refined lighting, high-end materials",
  },
  editorial: {
    layout: "editorial_card",
    palette: editorialPalette(),
    typography: "editorial",
    energy: "premium",
    imageTreatment: "lifestyle",
    subjectHint: "magazine editorial composition, tasteful human/product moment",
  },
  corporate: {
    layout: "split_product",
    palette: corporatePalette(),
    typography: "dense",
    energy: "technical",
    imageTreatment: "device_mockup",
    subjectHint: "professional work environment, clean business interface, trust-building",
  },
  futuristic: {
    layout: "hero_device",
    palette: futurePalette(),
    typography: "bold",
    energy: "technical",
    imageTreatment: "abstract_3d",
    subjectHint: "futuristic interface, glassmorphism, precise 3D shapes, AI-native feel",
  },
  gen_z: {
    layout: "social_burst",
    palette: genZPalette(),
    typography: "bold",
    energy: "playful",
    imageTreatment: "lifestyle",
    subjectHint: "vibrant social-first lifestyle scene, playful composition, expressive color",
  },
  dark_mode: {
    layout: "hero_device",
    palette: darkPalette(),
    typography: "bold",
    energy: "technical",
    imageTreatment: "device_mockup",
    subjectHint: "dark interface glow, premium black surfaces, precise teal highlights",
  },
  startup_clean: {
    layout: "editorial_card",
    palette: startupPalette(),
    typography: "editorial",
    energy: "calm",
    imageTreatment: "device_mockup",
    subjectHint: "clean founder workspace, laptop or product mockup, startup productivity vibe",
  },
  apple_minimal: {
    layout: "minimal_luxury",
    palette: applePalette(),
    typography: "luxury",
    energy: "premium",
    imageTreatment: "cinematic",
    subjectHint: "Apple-like industrial design, minimal hardware scene, cinematic shadows",
  },
  stripe_saas: {
    layout: "split_product",
    palette: stripePalette(),
    typography: "editorial",
    energy: "technical",
    imageTreatment: "abstract_3d",
    subjectHint: "Stripe-like geometric SaaS abstraction, interface cards, clean gradients in physical 3D",
  },
};

const platformProfiles: Record<
  CreativePlatform,
  { preferredLayout?: CreativeLayout; typography?: CreativeDirection["typography"] }
> = {
  instagram: { preferredLayout: "bold_poster", typography: "bold" },
  linkedin: { preferredLayout: "split_product", typography: "dense" },
  twitter: { preferredLayout: "editorial_card", typography: "editorial" },
  facebook: { preferredLayout: "editorial_card", typography: "editorial" },
  youtube: { preferredLayout: "bold_poster", typography: "bold" },
  threads: { preferredLayout: "editorial_card", typography: "editorial" },
  website: { preferredLayout: "minimal_luxury", typography: "luxury" },
};

function saasPalette() {
  return palette("#F6F8FF", "#DEE7FF", "#111827", "#5B6475", "#635BFF", "#111827", "#FFFFFF");
}
function startupPalette() {
  return palette("#FAFAF7", "#E9F7F0", "#141414", "#666A60", "#0F8A60", "#0F8A60", "#FFFFFF");
}
function luxuryPalette() {
  return palette("#F7F4ED", "#E8DFD0", "#17130F", "#756B5D", "#A5793D", "#17130F", "#FFFFFF");
}
function applePalette() {
  return palette("#F5F5F3", "#E8E8E4", "#111111", "#676767", "#8C8C84", "#111111", "#FFFFFF");
}
function boldPalette() {
  return palette("#111111", "#2A1616", "#FFFFFF", "#D6D6D6", "#FF4D2D", "#FF4D2D", "#111111");
}
function genZPalette() {
  return palette("#FFF2F8", "#DDF7FF", "#111827", "#6B6170", "#F973D7", "#111827", "#FFFFFF");
}
function darkPalette() {
  return palette("#080A0F", "#152018", "#F5F7F5", "#A9B3AA", "#1D9E75", "#1D9E75", "#04100B");
}
function stripePalette() {
  return palette("#F8F7FF", "#DDEBFF", "#141429", "#6A6F85", "#635BFF", "#635BFF", "#FFFFFF");
}
function aestheticPalette() {
  return palette("#FFF7F0", "#F5E1D7", "#221813", "#756861", "#D68C66", "#221813", "#FFFFFF");
}
function minimalPalette() {
  return palette("#FBFAF6", "#EFEDE6", "#181818", "#70706B", "#0F8A60", "#181818", "#FFFFFF");
}
function editorialPalette() {
  return palette("#FFFDF7", "#EFE7D8", "#171717", "#68645D", "#0F8A60", "#171717", "#FFFFFF");
}
function corporatePalette() {
  return palette("#F6F8FA", "#DCE5EE", "#172033", "#607084", "#2563EB", "#172033", "#FFFFFF");
}
function futurePalette() {
  return palette("#070A12", "#132442", "#F4F8FF", "#A8B2C4", "#4DE3FF", "#4DE3FF", "#061018");
}

function palette(
  bg: string,
  bgEdge: string,
  text: string,
  muted: string,
  accent: string,
  pillFill: string,
  pillText: string
) {
  return { bg, bgEdge, text, muted, accent, pillFill, pillText };
}

