"use client";

import { useEffect, useRef, useState } from "react";
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

  // Resizable / minimizable working canvas (desktop). convW = conversation
  // column width in px; canvasMode controls split / maximized / minimized.
  const [convW, setConvW] = useState(390);
  const [canvasMode, setCanvasMode] = useState<"split" | "max" | "min">("split");
  const rowRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !rowRef.current) return;
      const left = rowRef.current.getBoundingClientRect().left;
      const w = Math.min(Math.max(e.clientX - left, 300), 760);
      setConvW(w);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

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

      <div
        ref={rowRef}
        className="flex min-h-0 flex-1"
        style={{ "--convw": `${convW}px` } as React.CSSProperties}
      >
        <section
          className={`${mobileView === "talk" ? "flex" : "hidden"} w-full min-w-0 flex-col border-r border-rule bg-paper/45 lg:flex ${
            canvasMode === "max"
              ? "lg:hidden"
              : canvasMode === "min"
                ? "lg:w-auto lg:flex-1"
                : "lg:w-[var(--convw)] lg:shrink-0"
          }`}
        >
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

        {/* Drag handle to resize the canvas (desktop, split mode only) */}
        {canvasMode === "split" && (
          <div
            onMouseDown={startDrag}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize working canvas"
            title="Drag to resize"
            className="group relative z-10 hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent hover:bg-strategy/10 lg:flex"
          >
            <span className="h-10 w-1 rounded-full bg-rule transition-colors group-hover:bg-strategy" />
          </div>
        )}

        <section
          className={`${mobileView === "work" ? "flex" : "hidden"} canvas-grid min-w-0 flex-1 flex-col lg:flex ${
            canvasMode === "min" ? "lg:hidden" : ""
          }`}
        >
          <div className="flex items-center justify-between border-b border-rule bg-white/65 px-5 py-2.5">
            <Label>Working canvas</Label>
            <div className="flex items-center gap-1.5">
              <div className="hidden items-center gap-0.5 lg:flex">
                {canvasMode !== "max" && (
                  <button
                    type="button"
                    onClick={() => setCanvasMode("min")}
                    aria-label="Minimize canvas"
                    title="Minimize"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCanvasMode(canvasMode === "max" ? "split" : "max")}
                  aria-label={canvasMode === "max" ? "Restore canvas" : "Maximize canvas"}
                  title={canvasMode === "max" ? "Restore" : "Maximize"}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
                >
                  {canvasMode === "max" ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9 7l3-3M12 4v2.5M12 4H9.5M7 9l-3 3M4 12v-2.5M4 12h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
              </div>
              <span className="font-mono text-xs text-muted">Ready</span>
            </div>
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
      {canvasMode === "min" && (
        <button
          type="button"
          onClick={() => setCanvasMode("split")}
          className="fixed bottom-4 right-4 z-40 hidden h-11 items-center gap-2 rounded-full border border-rule bg-white px-4 text-sm font-medium text-ink shadow-raised hover:border-strategy hover:text-strategy-deep lg:flex"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Show canvas
        </button>
      )}
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
