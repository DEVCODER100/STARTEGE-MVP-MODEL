import Link from "next/link";
import { auth } from "@/auth";
import { LogoMark } from "@/components/ui/Logo";

export default async function LandingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const ctaHref = userId ? "/dashboard" : "/signup";
  const ctaText = userId ? "Continue creating" : "Generate your first post";

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-primary font-medium tracking-tight"
          >
            <LogoMark size={26} />
            <span className="font-display text-xl">Stratège</span>
          </Link>
          <nav className="flex items-center gap-2 md:gap-4">
            <Link
              href="/pricing"
              className="hidden md:inline text-text-secondary text-sm hover:text-text-primary px-2 py-1.5"
            >
              Pricing
            </Link>
            {userId ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium shadow-card"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-text-secondary text-sm hover:text-text-primary px-3 py-1.5"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium shadow-card"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 max-w-4xl mx-auto text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-xs text-text-secondary px-3 py-1.5 rounded-full border border-border bg-white shadow-card hover:border-border-strong"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Now in private beta
          <span className="text-text-muted">→</span>
        </Link>

        <h1 className="font-display text-5xl md:text-7xl text-text-primary mt-8 leading-[1.05]">
          Turn startup progress into{" "}
          <span className="italic text-accent">
            content people actually read.
          </span>
        </h1>

        <p className="text-text-secondary mt-6 text-lg max-w-xl mx-auto">
          Stratège helps founders create hooks, posts, visuals, and scripts in
          their own voice — without spending hours thinking what to post.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={ctaHref}
            className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-light text-white font-medium text-sm shadow-card transition-colors"
          >
            {ctaText}
          </Link>
          <Link
            href="#how-it-works"
            className="px-6 py-3 rounded-lg border border-border bg-white text-text-primary text-sm hover:border-border-strong"
          >
            Learn more
          </Link>
        </div>

        <p className="text-text-muted text-xs mt-5">
          No credit card · Free during private beta
        </p>
      </section>

      {/* Mock app preview */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="rounded-card border border-border bg-white shadow-elevated overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-bg-sidebar flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            <span className="text-text-muted text-xs ml-3">stratege.in</span>
          </div>
          <div className="grid md:grid-cols-[200px,1fr]">
            <div className="hidden md:block bg-bg-sidebar border-r border-border p-4 text-sm">
              <div className="text-text-muted text-[10px] uppercase tracking-wider mb-2">
                Menu
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-bg-accent-dk text-accent">
                ✦ AI coach
              </div>
              <div className="px-2 py-1.5 mt-1 text-text-secondary">
                ◇ Brand profile
              </div>
              <div className="px-2 py-1.5 text-text-secondary">↑ Upgrade</div>
            </div>
            <div className="p-8 md:p-12">
              <div className="text-text-muted text-xs">Today&apos;s task</div>
              <div className="font-display text-2xl text-text-primary mt-2">
                Post a behind-the-scenes reel of your packing process
              </div>
              <div className="mt-4 inline-flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-xs rounded-full bg-bg-accent-dk text-accent">
                  Instagram
                </span>
                <span className="px-2.5 py-1 text-xs rounded-full bg-bg-soft text-text-secondary">
                  7:00 PM
                </span>
                <span className="px-2.5 py-1 text-xs rounded-full bg-bg-soft text-text-secondary">
                  Reel
                </span>
              </div>
              <div className="mt-6 p-4 rounded-card bg-bg-soft border border-border">
                <div className="text-text-secondary text-xs mb-2">
                  Caption
                </div>
                <p className="text-text-primary text-sm leading-relaxed">
                  Yeh rahi aaj ki packing 📦 har order, hand-checked. Tag a
                  friend who loves details like this. #SuratMade #SmallBiz
                </p>
                <button className="mt-4 px-3 py-1.5 text-xs rounded-lg bg-accent text-white">
                  Copy everything
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 max-w-5xl mx-auto scroll-mt-20">
        <div className="text-center mb-12">
          <div className="text-accent text-xs font-medium uppercase tracking-wider mb-3">
            How it works
          </div>
          <h2 className="font-display text-4xl text-text-primary">
            Three steps to <span className="italic">done.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              n: "01",
              title: "Set up your brand once",
              body: "9 quick taps. We learn your product, audience, city, and goals — never repeated.",
            },
            {
              n: "02",
              title: "Get one task daily",
              body: "Caption, image, hashtags, WhatsApp message — pre-prepared every morning.",
            },
            {
              n: "03",
              title: "Post in 5 minutes",
              body: "Copy everything in one tap. Open Instagram. Done. Repeat tomorrow.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-white border border-border rounded-card p-6 shadow-card"
            >
              <div className="text-accent font-display text-xl">{s.n}</div>
              <div className="text-text-primary font-medium mt-2">
                {s.title}
              </div>
              <div className="text-text-secondary text-sm mt-2 leading-relaxed">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Final CTA */}
      <section className="px-6 py-24 max-w-3xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl text-text-primary">
          Stop overthinking marketing.
          <br />
          <span className="italic text-accent">Start posting.</span>
        </h2>
        <div className="mt-8">
          <Link
            href={ctaHref}
            className="inline-block px-8 py-3.5 rounded-lg bg-accent hover:bg-accent-light text-white font-medium text-sm shadow-card"
          >
            {ctaText}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <LogoMark size={18} />
            © {new Date().getFullYear()} Stratège · stratege.in
          </div>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="hover:text-text-primary">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-text-primary">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
