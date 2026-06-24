import { MarketingNav, MarketingFooter } from "@/components/marketing/Chrome";
import { Label } from "@/components/ui/primitives";

const compare = [
  ["Conversations & strategy", "Unlimited", "Unlimited"],
  ["Generated visuals", "20 / month", "150 / month"],
  ["Brand profiles", "1", "3"],
  ["Campaign history", "30 days", "Unlimited"],
  ["Export resolution", "Standard", "High-res"],
  ["Support", "Community", "Priority"],
];

const faqs = [
  ["What uses an image credit?", "Generating a new image direction or a final visual uses 1 credit each. Editing text on a visual you already made, regenerating a caption, or planning a campaign is free."],
  ["Do conversations cost anything?", "No. Talking to Stratège, planning campaigns, and editing text artifacts are unlimited on both plans."],
  ["Can I cancel anytime?", "Yes. Pro is month-to-month. You keep access until the end of the period."],
  ["Is my brand data private?", "Your brand memory is yours. We don't train shared models on it or show it to anyone else."],
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <MarketingNav />
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="text-center">
          <Label>Pricing</Label>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">
            Priced in product, not buzzwords.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            One free beta plan, one Pro plan, and credit packs only if you generate a lot of
            visuals. You always know what a credit buys before you spend it.
          </p>
        </div>

        {/* Compare */}
        <div className="mt-14">
          <h2 className="font-display text-2xl text-ink">Compare in detail</h2>
          <div className="mt-4 overflow-hidden rounded-card border border-rule">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas text-left">
                  <th className="px-4 py-3 font-medium text-muted">Feature</th>
                  <th className="px-4 py-3 font-medium text-ink">Beta</th>
                  <th className="px-4 py-3 font-medium text-ink">Pro</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(([f, a, b], i) => (
                  <tr key={f} className={i % 2 ? "bg-white" : "bg-paper/40"}>
                    <td className="border-t border-rule px-4 py-3 text-ink">{f}</td>
                    <td className="border-t border-rule px-4 py-3 text-muted">{a}</td>
                    <td className="border-t border-rule px-4 py-3 text-strategy-deep">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-14">
          <h2 className="font-display text-2xl text-ink">Questions, answered plainly</h2>
          <div className="mt-4 divide-y divide-rule rounded-card border border-rule bg-white">
            {faqs.map(([q, a]) => (
              <details key={q} className="group p-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-ink">
                  {q}
                  <svg className="text-muted group-open:rotate-45" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
