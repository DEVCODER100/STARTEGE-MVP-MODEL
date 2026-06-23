import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { LogoMark } from "@/components/ui/Logo";
import StrategyDeskDemo from "@/components/marketing/StrategyDeskDemo";

const contextItems = [
  ["Audience", "Design-conscious women, 24–38"],
  ["Voice", "Warm, candid, quietly confident"],
  ["City", "Bengaluru"],
  ["Goal", "Build repeat purchase"],
  ["Platform", "Instagram + WhatsApp"],
];

export default async function LandingPage() {
  const session = await auth();
  const ctaHref = session?.user?.id ? "/dashboard" : "/signup";
  const ctaText = session?.user?.id ? "Open my strategy desk" : "Create my first post";

  return (
    <main className="marketing-page">
      <header className="site-header">
        <div className="site-shell site-header__inner">
          <Link href="/" className="brand-lockup" aria-label="Stratège home">
            <LogoMark size={25} />
            <span>Stratège</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#brand-memory">Brand memory</Link>
            <Link href="/pricing">Pricing</Link>
            {session?.user?.id ? (
              <Link href="/dashboard" className="button button--small">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link href="/signup" className="button button--small">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="hero site-shell">
        <div className="hero__copy">
          <p className="kicker"><span /> Private beta · built for small teams</p>
          <h1>
            Your business already has stories.{" "}
            <em>Stratège turns them into marketing.</em>
          </h1>
          <p className="hero__lede">
            Tell Stratège what happened today. Leave with the post, visual,
            campaign angle, and next move—shaped around your actual brand.
          </p>
          <div className="hero__actions">
            <Link href={ctaHref} className="button">{ctaText} <span>↗</span></Link>
            <Link href="#desk" className="text-link">Watch it work <span>↓</span></Link>
          </div>
          <p className="microcopy">No credit card · Your first artifact is free</p>
          <div className="margin-annotation">
            <span>Strategy note</span>
            <p>Start with a real business moment—not an empty prompt box.</p>
          </div>
        </div>

        <div className="hero__proof" aria-label="Example finished marketing artifact">
          <div className="hero__proof-rule" />
          <p className="eyebrow">Finished in one conversation</p>
          <div className="hero__artifact">
            <Image
              src="/found.png"
              alt="A finished founder marketing post created in Stratège"
              width={1080}
              height={1920}
              priority
            />
          </div>
          <div className="proof-caption">
            <span>Input</span>
            <p>“I’m building something for founders who hate marketing.”</p>
          </div>
          <div className="proof-mark">01</div>
        </div>
      </section>

      <section id="desk" className="desk-section">
        <div className="site-shell">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">The strategy desk</p>
              <h2>Watch one sentence become <em>finished work.</em></h2>
            </div>
            <p>
              The conversation is the control layer. The artifact—the post,
              visual, campaign, or ad—is the product.
            </p>
          </div>
          <StrategyDeskDemo />
        </div>
      </section>

      <section id="how-it-works" className="narrative site-shell">
        <div className="section-index">01—04</div>
        <div className="narrative__intro">
          <p className="eyebrow">One sentence → one week</p>
          <h2>A small moment can do more than fill today’s feed.</h2>
        </div>
        <div className="narrative__steps">
          {[
            ["01", "Notice", "You share the milestone, customer question, new product, or messy thought."],
            ["02", "Choose", "Stratège finds the strongest story angle and shows why it fits your brand."],
            ["03", "Make", "The post, reel script, visual direction, WhatsApp copy, and follow-up assemble."],
            ["04", "Learn", "You record what happened. The next recommendation gets sharper."],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="output-gallery">
        <div className="site-shell">
          <div className="section-heading">
            <p className="eyebrow">Real-looking output, with a proof trail</p>
            <h2>Not just what to post. <em>Why this story, now.</em></h2>
          </div>
          <div className="gallery-layout">
            <div className="gallery-primary">
              <Image
                src="/story.png"
                alt="Long-form founder story artifact"
                width={1080}
                height={1920}
              />
              <div className="gallery-label">
                <span>Founder story</span>
                <p>Built from a rough voice note about a failed first product.</p>
              </div>
            </div>
            <div className="gallery-side">
              <blockquote>
                “I built every day, but I didn’t know how to turn that into content.”
              </blockquote>
              <div className="choice-note">
                <span>Strategic choice</span>
                <p>
                  Lead with the honest failure. It earns attention before the
                  product appears.
                </p>
              </div>
              <div className="mini-output">
                <p className="eyebrow">Repurposed automatically</p>
                <strong>1 founder story</strong>
                <span>→ 3 reel hooks</span>
                <span>→ 1 LinkedIn post</span>
                <span>→ 2 WhatsApp updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="brand-memory" className="brand-memory site-shell">
        <div className="brand-memory__copy">
          <p className="eyebrow">Your brand stays in the room</p>
          <h2>Personalization you can <em>see, edit, and overrule.</em></h2>
          <p>
            Every recommendation shows which parts of your brand shaped it.
            Remove a detail for this request, correct it once, or approve
            something new Stratège learned.
          </p>
          <Link href={ctaHref} className="text-link">Build my brand profile <span>↗</span></Link>
        </div>
        <div className="context-sheet">
          <div className="context-sheet__header">
            <div>
              <p className="eyebrow">Using from your brand</p>
              <strong>Studio Nila</strong>
            </div>
            <span>5 active details</span>
          </div>
          {contextItems.map(([label, value], index) => (
            <div className="context-row" key={label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p><small>{label}</small>{value}</p>
              <button type="button" aria-label={`Remove ${label}`}>×</button>
            </div>
          ))}
          <div className="context-connection">
            <span />
            <p>Audience + voice influenced the founder-led recommendation.</p>
          </div>
        </div>
      </section>

      <section className="workflows site-shell">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Three common workdays</p>
            <h2>Bring the moment. Leave with the work.</h2>
          </div>
          <p>No mode-switching jargon. Start with the job you need done.</p>
        </div>
        {[
          ["Make today’s post", "A customer sent a lovely message.", "Post + visual direction + best time", "12 min"],
          ["Plan a launch", "The summer collection goes live Friday.", "7-day campaign + WhatsApp sequence", "One desk"],
          ["Create an ad", "This product photo is converting organically.", "3 ad angles + copy + creative board", "3 directions"],
        ].map(([title, input, output, meta], index) => (
          <article className="workflow-row" key={title}>
            <span className="workflow-row__number">0{index + 1}</span>
            <h3>{title}</h3>
            <div><small>You say</small><p>“{input}”</p></div>
            <div><small>You leave with</small><p>{output}</p></div>
            <b>{meta} ↗</b>
          </article>
        ))}
      </section>

      <section className="beta-note">
        <div className="site-shell beta-note__inner">
          <p className="eyebrow">An honest beta</p>
          <h2>Small, early, and built close to the people using it.</h2>
          <p>
            Stratège is in private beta. That means no invented customer wall,
            no fantasy metrics, and a direct line to the team shaping the product.
          </p>
          <Link href={ctaHref} className="button button--paper">{ctaText}</Link>
        </div>
      </section>

      <section className="pricing-preview site-shell">
        <div>
          <p className="eyebrow">Simple during beta</p>
          <h2>Start free. Upgrade when Stratège becomes part of the week.</h2>
        </div>
        <div className="price-note">
          <span>Private beta</span>
          <strong>₹0</strong>
          <p>Brand profile, strategy conversations, and your first ready-to-post artifacts.</p>
          <Link href="/pricing" className="text-link">See complete pricing <span>↗</span></Link>
        </div>
      </section>

      <section className="final-cta site-shell">
        <p className="eyebrow">Your next post is probably already happening</p>
        <h2>Tell Stratège what happened today.</h2>
        <Link href={ctaHref} className="button">{ctaText} <span>↗</span></Link>
      </section>

      <footer className="site-footer">
        <div className="site-shell site-footer__inner">
          <div className="brand-lockup"><LogoMark size={22} /><span>Stratège</span></div>
          <p>Business moments → clear decisions → finished marketing.</p>
          <nav>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Start free</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
