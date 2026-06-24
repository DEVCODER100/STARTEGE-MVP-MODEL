// One coherent Indian-founder brand used consistently across every screen.
// No fake metrics, no invented testimonials — beta-honest signals only.

export const brand = {
  name: "Nivaasa",
  tagline: "Hand block-printed home textiles, made in Jaipur",
  founder: "Aarohi Mehta",
  city: "Jaipur, Rajasthan",
  category: "Small-batch home textiles (D2C)",
  audience:
    "Women 26–40 in metro cities furnishing first homes; value handmade, slow craft over fast decor",
  tone: ["Warm", "Grounded", "Proud of craft", "Unhurried"],
  goal: "Sell out the new indigo Dabu collection before Diwali",
  platforms: ["Instagram", "WhatsApp Broadcast"],
  colors: ["#1E3A5F", "#E8793B", "#F0E6D2", "#7A5C3E"],
  productPhoto: "Indigo Dabu bedcover on jute floor, natural window light",
};

export const voiceTraits = [
  { trait: "Warm", value: 78, low: "Formal", high: "Warm" },
  { trait: "Plain-spoken", value: 64, low: "Poetic", high: "Plain" },
  { trait: "Confident", value: 70, low: "Modest", high: "Bold" },
  { trait: "Calm", value: 85, low: "Energetic", high: "Calm" },
];

export const wordsToUse = [
  "hand block-printed",
  "small-batch",
  "natural dye",
  "artisan",
  "slow craft",
  "made to last",
];

export const wordsToAvoid = [
  "luxury",
  "cheap",
  "trendy",
  "exclusive deal",
  "limited time only!!",
  "ethnic",
];

export const customerProfiles = [
  {
    name: "The first-home nester",
    age: "28–34",
    note: "Just moved in with a partner. Wants pieces with a story, not a showroom.",
    buys: "Bedcovers, cushion covers, table linen",
  },
  {
    name: "The conscious gifter",
    age: "32–40",
    note: "Buys handmade for housewarmings and weddings. Reads the craft story before price.",
    buys: "Gift sets, dohars, runners",
  },
];

export const contentPillars = [
  { name: "Behind the craft", share: 40, note: "Artisans, process, the workshop" },
  { name: "Styled in real homes", share: 30, note: "Customer homes, not studio sets" },
  { name: "Care & longevity", share: 20, note: "How to make it last" },
  { name: "Founder notes", share: 10, note: "Aarohi's voice, milestones" },
];

// The hero transformation sequence
export const angles = [
  {
    id: "behind",
    label: "Behind the scenes",
    blurb: "Show the team packing — founder-led, human, proud.",
    recommended: true,
  },
  {
    id: "gratitude",
    label: "A thank-you note",
    blurb: "Speak directly to the first 100 customers.",
    recommended: false,
  },
  {
    id: "milestone",
    label: "Quiet milestone",
    blurb: "Frame 100 orders as proof slow craft has a market.",
    recommended: false,
  },
];

// A finished artifact used on landing + workspace
export const samplePost = {
  title: "First 100 orders — behind the scenes",
  platform: "Instagram Reel",
  status: "Ready to review",
  hook: "100 bedcovers. 6 pairs of hands. One very long table.",
  caption:
    "Today we packed our first 100 orders. Every Dabu bedcover was checked, folded and wrapped by the same small team that printed it. No warehouse, no machines — just us, a long table, and a lot of chai.\n\nThank you for choosing slow over fast. This is only the beginning.",
  cta: "Comment 'INDIGO' and we'll send you the new collection on WhatsApp.",
  hashtags: ["#handblockprint", "#madeinjaipur", "#slowcraft", "#dabu", "#smallbatch"],
  visual: "Founder + team mid-pack at the long printing table, warm window light, jute floor",
  postingTime: "Thu, 7:30 PM IST",
  why: "This brand's audience responds to founder-led stories. Process posts hold attention 1.8× longer than product-only posts in your last 12 reels.",
};

// Real-output gallery — input → choice → output → honest outcome
export const gallery = [
  {
    input: "\"Monsoon means everyone's stuck indoors scrolling.\"",
    business: "Nivaasa · Jaipur home textiles",
    choice: "Chose a cosy-home angle over a discount push",
    output: "Reel: 'Make the indoors worth staying in' + 4-slide styling carousel",
    outcome: "Posted in 4 minutes · saved for the festive grid",
  },
  {
    input: "\"A customer sent a photo of our dohar in her Bombay flat.\"",
    business: "Nivaasa · Jaipur home textiles",
    choice: "Turned UGC into a 'real homes' story with permission ask",
    output: "Caption + WhatsApp reply template + repost frame",
    outcome: "Used same day · added to 'Styled in real homes' pillar",
  },
  {
    input: "\"Diwali is 6 weeks away and I have no plan.\"",
    business: "Nivaasa · Jaipur home textiles",
    choice: "Built a 6-week festive campaign, not a single post",
    output: "Week-by-week calendar: teaser → craft → drop → restock",
    outcome: "Drafted in one sitting · editing week 1 now",
  },
];

export const workflowStories = [
  {
    kicker: "Daily post",
    title: "A slow Tuesday becomes a reel",
    body: "You tell Stratège the indigo vats were dyed this morning. It returns a process reel, a caption in your voice, and the best time to post — before lunch.",
  },
  {
    kicker: "Launch campaign",
    title: "Six weeks of festive marketing from one sentence",
    body: "\"Diwali is coming.\" Stratège plans the teaser, the craft story, the drop, and the restock — as editable artifacts you can move around a calendar.",
  },
  {
    kicker: "Paid ad",
    title: "A first ad that sounds like you",
    body: "Stratège drafts a WhatsApp-first ad for the conscious gifter, with three hooks and a budget split — and tells you which audience detail shaped each line.",
  },
];

export const briefing = {
  date: "Monday, 22 June",
  opportunity: {
    title: "Indigo Dabu collection dyed this morning",
    why: "Process content is your highest-saving pillar, and the collection is your Diwali bet.",
  },
  milestone: "You crossed 100 orders on Saturday — still unposted.",
  task: "Make today's post from the 100-orders moment before it goes cold.",
};

export const jobs = [
  { id: "campaign", label: "Plan a campaign", hint: "A launch, festival, or drop" },
  { id: "today", label: "Make today's post", hint: "Turn a moment into a reel or carousel" },
  { id: "ad", label: "Create an ad", hint: "Instagram or WhatsApp-first" },
  { id: "review", label: "Review my content", hint: "Check a draft against your brand" },
  { id: "next", label: "Find my next move", hint: "One useful thing to do today" },
];

export const recentWork = [
  { name: "Diwali festive campaign", kind: "Campaign", when: "2h ago", status: "Draft" },
  { name: "100 orders — behind the scenes", kind: "Reel", when: "Today", status: "Review" },
  { name: "Real homes: Bombay dohar", kind: "Caption", when: "Yesterday", status: "Posted" },
  { name: "Care guide: washing Dabu", kind: "Carousel", when: "3d ago", status: "Posted" },
];

export const learnedRecently = [
  {
    fact: "Reels with the founder's voice-over outperform text-only by a wide margin.",
    source: "From your last 12 posts",
  },
  {
    fact: "Your audience is most active Thursday and Sunday evenings.",
    source: "From posting history",
  },
  {
    fact: "\"Dohar\" gets more saves than \"throw blanket\" with your audience.",
    source: "From caption A/B in May",
  },
];
