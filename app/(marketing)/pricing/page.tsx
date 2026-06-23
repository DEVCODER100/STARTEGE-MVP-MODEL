import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

const included = [
  "Living brand profile",
  "Strategy conversations",
  "Posts, hooks, scripts, and WhatsApp copy",
  "Editable content artifacts",
  "Campaign history and versions",
];

export default function PricingPage() {
  return (
    <main className="pricing-page">
      <header className="site-header">
        <div className="site-shell site-header__inner">
          <Link href="/" className="brand-lockup">
            <LogoMark size={25} />
            <span>Stratège</span>
          </Link>
          <nav>
            <Link href="/">The product</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="button button--small">Start free</Link>
          </nav>
        </div>
      </header>

      <section className="pricing-hero site-shell">
        <p className="kicker"><span /> Clear pricing, while we are in beta</p>
        <h1>Start with the story.<br /><em>Pay when the desk earns its place.</em></h1>
        <p>
          Strategy and writing are included. Image credits are shown before
          generation, so a creative choice never becomes a surprise charge.
        </p>
      </section>

      <section className="pricing-table site-shell">
        <article className="plan plan--beta">
          <div className="plan__top">
            <span>01 · Private beta</span>
            <strong>Free</strong>
            <p>For founders turning everyday business moments into consistent marketing.</p>
          </div>
          <ul>
            {included.map((item) => <li key={item}><span>✓</span>{item}</li>)}
            <li><span>✓</span>Starter image credits</li>
          </ul>
          <Link href="/signup" className="button">Create my first post <span>↗</span></Link>
          <small>No credit card required</small>
        </article>

        <article className="plan plan--pro">
          <div className="plan__flag">Opening after private beta</div>
          <div className="plan__top">
            <span>02 · Pro</span>
            <strong>₹999 <small>/ month</small></strong>
            <p>For a founder or small team using Stratège as a weekly marketing desk.</p>
          </div>
          <ul>
            <li><span>✓</span>Everything in private beta</li>
            <li><span>✓</span>More strategy and artifact capacity</li>
            <li><span>✓</span>High-resolution exports</li>
            <li><span>✓</span>More image generations included</li>
            <li><span>✓</span>Priority product support</li>
            <li><span>✓</span>Optional image-credit packs</li>
          </ul>
          <Link href="/signup" className="button button--paper">Join the beta first <span>↗</span></Link>
          <small>Price shown is the planned launch price</small>
        </article>
      </section>

      <section className="credit-explainer site-shell">
        <div>
          <p className="eyebrow">What uses an image credit?</p>
          <h2>Only generating a new image.</h2>
        </div>
        <div className="credit-list">
          <p><span>Included</span>Strategy, copy, editing, brand memory, exports, and reusing an existing visual.</p>
          <p><span>Uses credit</span>Generating a new visual direction or regenerating the underlying image.</p>
          <p><span>No full charge</span>Editing overlay text, crops, caption blocks, or the publishing details.</p>
        </div>
      </section>

      <section className="pricing-faq site-shell">
        <p className="eyebrow">Useful details</p>
        {[
          ["Will the free beta stay free?", "Your current beta access remains free while the private beta is running. We will communicate any change before it takes effect."],
          ["Can I cancel Pro?", "Yes. Pro will be month-to-month, with no annual lock-in required."],
          ["Is this for agencies?", "Not yet. The current product is deliberately shaped around one founder or one small business brand."],
        ].map(([q, a], i) => (
          <article key={q}>
            <span>0{i + 1}</span>
            <h3>{q}</h3>
            <p>{a}</p>
          </article>
        ))}
      </section>

      <section className="final-cta site-shell">
        <p className="eyebrow">Start with something that happened today</p>
        <h2>Leave with something worth posting.</h2>
        <Link href="/signup" className="button">Create my first post <span>↗</span></Link>
      </section>
    </main>
  );
}
