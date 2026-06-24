import { DeskButton, Label } from "@/components/ui/primitives";

const plans = [
  {
    name: "Private beta",
    price: "Free",
    cadence: "while in beta",
    blurb: "For founders trying Stratège on a real brand.",
    cta: "Start free",
    href: "/signup",
    featured: false,
    features: [
      "1 brand profile",
      "Unlimited conversations & strategy",
      "20 generated visuals / month",
      "Campaign history (30 days)",
      "Instagram + WhatsApp exports",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "₹1,499",
    cadence: "per month",
    blurb: "For founders posting and selling every week.",
    cta: "Choose Pro",
    href: "/signup",
    featured: true,
    features: [
      "3 brand profiles",
      "Unlimited conversations & strategy",
      "150 generated visuals / month",
      "Unlimited campaign history",
      "High-resolution exports",
      "Priority support",
    ],
  },
];

export function PricingPlans({
  withPacks = true,
  inApp = false,
}: {
  withPacks?: boolean;
  inApp?: boolean;
}) {
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-artifact border p-6 ${
              p.featured
                ? "border-strategy bg-white shadow-artifact"
                : "border-rule bg-canvas"
            }`}
          >
            {p.featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                Most founders pick this
              </span>
            )}
            <Label>{p.name}</Label>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl text-ink">{p.price}</span>
              <span className="text-sm text-muted">{p.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{p.blurb}</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="8" fill="#E7F1EC" />
                    <path d="M4.5 8.2 7 10.5 11.5 5.5" stroke="#087A55" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-ink/90">{f}</span>
                </li>
              ))}
            </ul>
            {inApp ? (
              <DeskButton
                variant={p.featured ? "primary" : "secondary"}
                className="mt-6 w-full"
                disabled
              >
                {p.featured ? "Opening after beta" : "Your current plan"}
              </DeskButton>
            ) : (
              <DeskButton href={p.href} variant={p.featured ? "primary" : "secondary"} className="mt-6 w-full">
                {p.cta}
              </DeskButton>
            )}
          </div>
        ))}
      </div>

      {withPacks && (
        <div className="mt-5 rounded-card border border-rule bg-paper/60 p-5">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <Label>Image credit packs</Label>
              <p className="mt-1 text-sm text-ink">
                Add visuals beyond your monthly limit. <span className="text-muted">₹299 for 50 credits.</span>
              </p>
            </div>
            <DeskButton variant="secondary" size="sm">Add credits</DeskButton>
          </div>
          <p className="mt-3 border-t border-rule pt-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-ink">What uses a credit:</span> generating a new
            image direction (1 credit) or a final visual (1 credit). Editing text on an
            already-generated visual, regenerating a caption, or planning a campaign costs
            nothing.
          </p>
        </div>
      )}
    </div>
  );
}
