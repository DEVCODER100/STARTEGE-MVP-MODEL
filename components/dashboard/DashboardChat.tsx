"use client";

import { useEffect, useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { Label } from "@/components/ui/primitives";
import HubMenu from "@/components/app/HubMenu";
import GuidedTour, { type TourStep } from "@/components/app/GuidedTour";

export type Mode = "coach" | "strategy" | "create";

const jobs = [
  ["Make today’s post", "Turn a real update into finished content", "create"],
  ["Plan a campaign", "Build the angle, sequence, and next move", "strategy"],
  ["Create a visual", "Direct a brand-aware image concept", "create"],
  ["Find my next move", "Get practical marketing guidance", "coach"],
] as const;

export default function DashboardChat({
  greeting,
  subline,
  chips,
  initialChatId,
}: {
  greeting: React.ReactNode;
  subline: string;
  chips: string[];
  initialChatId: string | null;
}) {
  const [mode, setMode] = useState<Mode>("coach");
  const [mobileView, setMobileView] = useState<"talk" | "work">("talk");
  const [hubOpen, setHubOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // Default true so the floating "Guide" launcher never flashes before we've
  // checked localStorage; the button only appears for first-time users.
  const [tourSeen, setTourSeen] = useState(true);

  useEffect(() => {
    const seen = !!localStorage.getItem("stratege_strategy_desk_tour");
    setTourSeen(seen);
    if (seen) return;
    const timer = window.setTimeout(() => setTourOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  const startJob = (nextMode: Mode, prompt: string) => {
    setMode(nextMode);
    setMobileView("talk");
    window.dispatchEvent(new CustomEvent("stratege:prefill", { detail: prompt }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex items-center justify-between border-b border-rule bg-paper/85 px-4 py-2 lg:hidden">
        <span className="font-display text-base text-ink">The strategy desk</span>
        <div className="flex rounded-full border border-rule bg-white p-0.5 text-sm">
          {(["talk", "work"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setMobileView(view)}
              className={`rounded-full px-4 py-1.5 capitalize ${mobileView === view ? "bg-ink text-paper" : "text-ink"}`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <section className={`${mobileView === "talk" ? "flex" : "hidden"} w-full min-w-0 flex-col border-r border-rule bg-paper/45 lg:flex lg:w-[390px] lg:shrink-0`}>
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <Label>Conversation</Label>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-rule bg-white p-0.5">
                {(["coach", "strategy", "create"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${mode === item ? "bg-strategy-tint font-medium text-strategy-deep" : "text-muted"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <HubMenu open={hubOpen} onOpenChange={setHubOpen} onStartGuide={() => setTourOpen(true)} />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col" data-tour="conversation">
            <ChatInterface
              key={initialChatId ?? "new"}
              mode={mode}
              greeting={greeting}
              subline={subline}
              chips={chips.slice(0, 3)}
              initialChatId={initialChatId}
              desk
            />
          </div>
        </section>

        <section className={`${mobileView === "work" ? "flex" : "hidden"} canvas-grid min-w-0 flex-1 flex-col lg:flex`}>
          <div className="flex items-center justify-between border-b border-rule bg-white/65 px-5 py-2.5">
            <Label>Working canvas</Label>
            <span className="font-mono text-xs text-muted">Ready</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5 lg:p-8">
            <div className="mx-auto max-w-2xl">
              <article data-tour="briefing" className="overflow-hidden rounded-artifact border border-rule bg-white shadow-artifact">
                <div className="flex items-center justify-between border-b border-rule bg-paper/45 px-5 py-3">
                  <Label>Today’s briefing</Label>
                  <span className="font-mono text-xs text-muted">1 opportunity</span>
                </div>
                <div className="space-y-5 p-5">
                  <div className="relative pl-11">
                    <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-accent-tint font-mono text-sm text-accent">01</span>
                    <Label>The opportunity</Label>
                    <h2 className="mt-1 font-display text-xl leading-tight text-ink">
                      Turn one real business moment into this week’s strongest story.
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm text-strategy-deep">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-strategy" />
                      Stratège will use your saved audience, voice, product, and goals.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-card border border-rule bg-canvas p-4">
                      <Label>Start with</Label>
                      <p className="mt-1.5 text-sm text-ink">A launch, customer question, milestone, or unfinished thought.</p>
                    </div>
                    <div className="rounded-card border border-rule bg-canvas p-4">
                      <Label>You leave with</Label>
                      <p className="mt-1.5 text-sm text-ink">The hook, caption, visual, script, or campaign you asked for.</p>
                    </div>
                  </div>
                </div>
              </article>

              <div className="mt-6">
                <Label>Start a job</Label>
                <div data-tour="jobs" className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {jobs.map(([title, hint, nextMode]) => (
                    <button
                      key={title}
                      onClick={() => startJob(nextMode, title)}
                      className="group flex min-h-[76px] items-center justify-between gap-3 rounded-card border border-rule bg-white p-4 text-left transition-colors hover:border-strategy hover:bg-strategy-tint/30"
                    >
                      <span>
                        <strong className="block text-sm font-medium text-ink">{title}</strong>
                        <small className="mt-0.5 block text-xs text-muted">{hint}</small>
                      </span>
                      <span className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-strategy">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {!tourSeen && (
        <button
          data-tour="help"
          onClick={() => setTourOpen(true)}
          className="fixed bottom-4 left-4 z-50 hidden h-11 items-center gap-2 rounded-full border border-rule bg-white px-4 text-sm font-medium text-ink shadow-raised hover:border-strategy lg:flex"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-strategy-tint text-strategy-deep">?</span>
          Guide
        </button>
      )}
      <GuidedTour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          setTourSeen(true);
        }}
        storageKey="stratege_strategy_desk_tour"
        steps={[
          { title: "Welcome to your strategy desk.", body: "Talk on the left. Finished work assembles on the canvas." },
          { target: "conversation", placement: "right", title: "Start with a real business moment", body: "Describe what happened or what you need. No prompt engineering required.", before: () => setHubOpen(false) },
          { target: "hubpanel", placement: "bottom", title: "History, library, creations, and guide", body: "This one menu keeps your recent work and product images close.", before: () => setHubOpen(true) },
          { target: "briefing", placement: "left", title: "Your daily briefing", body: "The desk surfaces one useful opportunity and explains why it fits.", before: () => setHubOpen(false) },
          { target: "jobs", placement: "left", title: "Or choose a job", body: "Start a post, campaign, visual, or coaching conversation from a clear outcome." },
        ] satisfies TourStep[]}
      />
    </div>
  );
}
