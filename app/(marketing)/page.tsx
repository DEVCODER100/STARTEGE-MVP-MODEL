"use client";

import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Chrome";
import { TransformationDemo } from "@/components/marketing/TransformationDemo";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import { DeskButton, TextLink, Label } from "@/components/ui/primitives";
import { InkUnderline } from "@/components/strategy/annotations";
import { gallery, workflowStories, brand } from "@/lib/brand";

const ease = [0.22, 1, 0.36, 1] as const;

function SectionLabel({ n, children }: { n: string; children: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="font-mono text-sm text-strategy-deep">{n}</span>
      <span className="h-px w-8 bg-rule" />
      <Label>{children}</Label>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <MarketingNav />

      {/* 1 · Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Private beta · for founders
            </div>
            <h1 className="font-display text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-[3.4rem]">
              Your business already has stories.{" "}
              <InkUnderline>Stratège turns them into marketing.</InkUnderline>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Tell Stratège what happened today. Leave with the post, visual, campaign
              angle, and next move—shaped around your actual brand.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <DeskButton href="/onboarding" size="lg">
                Create my first post
              </DeskButton>
              <TextLink href="#how">Watch it work</TextLink>
            </div>
            <p className="mt-5 text-sm text-muted">
              No credit card. Bring one real brand and leave with something postable.
            </p>
          </div>

          <div id="how">
            <TransformationDemo />
          </div>
        </div>
      </section>

      {/* 2 · One sentence → one week */}
      <section className="border-y border-rule bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <SectionLabel n="01">From one sentence to a week of marketing</SectionLabel>
          <h2 className="max-w-2xl font-display text-3xl leading-tight text-ink">
            One business moment can carry a whole week.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            {[
              { day: "Mon", label: "The moment", text: "\"We packed our first 100 orders.\"", tone: "ink" },
              { day: "Tue", label: "The reel", text: "Behind-the-scenes packing reel + caption in your voice", tone: "paper" },
              { day: "Thu", label: "The proof", text: "Customer repost turned into a 'real homes' story", tone: "paper" },
              { day: "Sun", label: "The next move", text: "WhatsApp broadcast to the 100 buyers about the next drop", tone: "green" },
            ].map((s, i) => (
              <motion.div
                key={s.day}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
                className={`flex flex-col gap-2 p-5 ${
                  s.tone === "green" ? "bg-strategy text-paper" : s.tone === "ink" ? "bg-ink text-paper" : "bg-white"
                }`}
              >
                <span className={`font-mono text-xs ${s.tone === "paper" ? "text-muted" : "text-paper/60"}`}>
                  {s.day}
                </span>
                <span className={`text-xs uppercase tracking-wider ${s.tone === "paper" ? "text-strategy-deep" : "text-paper/80"}`}>
                  {s.label}
                </span>
                <p className={`text-[0.95rem] leading-snug ${s.tone === "paper" ? "text-ink" : ""}`}>{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · Real output gallery */}
      <section id="gallery" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <SectionLabel n="02">Real output, real context</SectionLabel>
        <h2 className="max-w-2xl font-display text-3xl leading-tight text-ink">
          Messy input in. Marked-up, on-brand work out.
        </h2>
        <div className="mt-10 space-y-4">
          {gallery.map((g, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, ease }}
              className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule md:grid-cols-[1.1fr_1fr_1.1fr_0.9fr]"
            >
              <div className="bg-paper p-5">
                <Label>Founder said</Label>
                <p className="mt-2 font-display text-lg italic leading-snug text-ink">{g.input}</p>
                <p className="mt-3 text-xs text-muted">{g.business}</p>
              </div>
              <div className="bg-white p-5">
                <Label>Strategic choice</Label>
                <p className="mt-2 text-sm leading-relaxed text-ink">{g.choice}</p>
              </div>
              <div className="bg-white p-5">
                <Label>Final output</Label>
                <p className="mt-2 text-sm leading-relaxed text-ink">{g.output}</p>
              </div>
              <div className="flex flex-col justify-between bg-strategy-tint p-5">
                <div>
                  <Label>What happened</Label>
                  <p className="mt-2 text-sm font-medium leading-snug text-strategy-deep">{g.outcome}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4 · Brand memory */}
      <section id="memory" className="border-y border-rule bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionLabel n="03">It remembers your brand</SectionLabel>
            <h2 className="font-display text-3xl leading-tight text-ink">
              Personalization you can see — and{" "}
              <InkUnderline tone="accent">override</InkUnderline>.
            </h2>
            <p className="mt-5 max-w-md text-muted">
              Stratège keeps a living memory of your audience, voice, city, goals, and
              visual identity. Every recommendation shows which detail shaped it, and you
              can remove any of it for a single request.
            </p>
            <DeskButton href="/brand" variant="secondary" className="mt-6">
              See the brand book
            </DeskButton>
          </div>
          <div className="rounded-artifact border border-rule bg-white p-6 shadow-artifact">
            <Label>{brand.name}&apos;s memory</Label>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Audience", "First-home nesters, metro cities"],
                ["Voice", "Warm, plain-spoken, proud of craft"],
                ["City", brand.city],
                ["Goal", "Sell out indigo Dabu before Diwali"],
                ["Avoid", "\"luxury\", \"ethnic\", \"limited time only!!\""],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 border-b border-rule pb-3 last:border-0">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted">{k}</span>
                  <span className="text-right text-ink">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              {brand.colors.map((c) => (
                <span key={c} className="h-8 flex-1 rounded-md border border-black/10" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 · Three workflow stories */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <SectionLabel n="04">Three ways founders use the desk</SectionLabel>
        <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-rule bg-rule lg:grid-cols-3">
          {workflowStories.map((w, i) => (
            <div key={w.title} className="flex flex-col gap-3 bg-white p-7">
              <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <Label>{w.kicker}</Label>
              <h3 className="font-display text-xl leading-tight text-ink">{w.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · Honest beta proof */}
      <section className="border-y border-rule bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <SectionLabel n="05">Honest about where we are</SectionLabel>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <h2 className="font-display text-3xl leading-tight">
              We&apos;re in private beta. No fake five-star walls, no invented numbers.
            </h2>
            <div className="grid grid-cols-3 gap-6 text-paper/90">
              {[
                ["4 min", "fastest moment → posted reel in testing"],
                ["1 brand", "what you need to start — your own"],
                ["0", "fake testimonials on this page"],
              ].map(([big, small]) => (
                <div key={small}>
                  <div className="font-display text-3xl text-accent">{big}</div>
                  <p className="mt-1 text-xs leading-snug text-paper/60">{small}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7 · Pricing */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <SectionLabel n="06">Pricing</SectionLabel>
        <h2 className="mb-10 max-w-xl font-display text-3xl leading-tight text-ink">
          Start free. Upgrade only when posting becomes a habit.
        </h2>
        <PricingPlans />
      </section>

      {/* 8 · Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-artifact border border-strategy bg-strategy px-8 py-14 text-center text-paper canvas-grid">
          <div className="absolute inset-0 bg-strategy/95" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
              Tell Stratège what happened today.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-paper/80">
              Bring one real brand. Leave with your first ready-to-post idea.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <DeskButton href="/onboarding" variant="accent" size="lg">
                Create my first post
              </DeskButton>
              <DeskButton href="/login" variant="secondary" size="lg">
                I already have an account
              </DeskButton>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
