"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/primitives";

// A reusable two-panel desk layout: a fixed-width "side" panel (conversation)
// and a flexible "main" panel (working canvas). The divider is draggable to
// resize, and the canvas can be minimized or maximized — like Claude's panels.
// Desktop only; on mobile it falls back to a Talk/Work toggle.
export default function ResizableSplit({
  side,
  main,
  sidePosition = "left",
  mainLabel = "Working canvas",
  mainStatus = "Ready",
  mobileTitle = "The strategy desk",
  sideTab = "Talk",
  mainTab = "Work",
}: {
  side: ReactNode;
  main: ReactNode;
  sidePosition?: "left" | "right";
  mainLabel?: string;
  mainStatus?: string;
  mobileTitle?: string;
  sideTab?: string;
  mainTab?: string;
}) {
  const [sideW, setSideW] = useState(390);
  const [mode, setMode] = useState<"split" | "max" | "min">("split");
  const [mobileView, setMobileView] = useState<"side" | "main">("side");
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
      const rect = rowRef.current.getBoundingClientRect();
      const w = sidePosition === "left" ? e.clientX - rect.left : rect.right - e.clientX;
      setSideW(Math.min(Math.max(w, 300), 760));
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
  }, [sidePosition]);

  const sideSection = (
    <section
      className={`${mobileView === "side" ? "flex" : "hidden"} w-full min-w-0 flex-col bg-paper/45 lg:flex ${
        sidePosition === "left" ? "border-r border-rule" : "border-l border-rule"
      } ${
        mode === "max"
          ? "lg:hidden"
          : mode === "min"
            ? "lg:w-auto lg:flex-1"
            : "lg:w-[var(--sidew)] lg:shrink-0"
      }`}
    >
      {side}
    </section>
  );

  const handle =
    mode === "split" ? (
      <div
        onMouseDown={startDrag}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        title="Drag to resize"
        className="group relative z-10 hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent hover:bg-strategy/10 lg:flex"
      >
        <span className="h-10 w-1 rounded-full bg-rule transition-colors group-hover:bg-strategy" />
      </div>
    ) : null;

  const mainSection = (
    <section
      className={`${mobileView === "main" ? "flex" : "hidden"} canvas-grid min-w-0 flex-1 flex-col lg:flex ${
        mode === "min" ? "lg:hidden" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-rule bg-white/65 px-5 py-2.5">
        <Label>{mainLabel}</Label>
        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-0.5 lg:flex">
            {mode !== "max" && (
              <button
                type="button"
                onClick={() => setMode("min")}
                aria-label="Minimize"
                title="Minimize"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "max" ? "split" : "max")}
              aria-label={mode === "max" ? "Restore" : "Maximize"}
              title={mode === "max" ? "Restore" : "Maximize"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
            >
              {mode === "max" ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9 7l3-3M12 4v2.5M12 4H9.5M7 9l-3 3M4 12v-2.5M4 12h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>
          <span className="font-mono text-xs text-muted">{mainStatus}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5 lg:p-8">{main}</div>
    </section>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mobile Talk/Work toggle */}
      <div className="flex items-center justify-between border-b border-rule bg-paper/85 px-4 py-2 lg:hidden">
        <span className="font-display text-base text-ink">{mobileTitle}</span>
        <div className="flex rounded-full border border-rule bg-white p-0.5 text-sm">
          <button
            onClick={() => setMobileView("side")}
            className={`rounded-full px-4 py-1.5 ${mobileView === "side" ? "bg-ink text-paper" : "text-ink"}`}
          >
            {sideTab}
          </button>
          <button
            onClick={() => setMobileView("main")}
            className={`rounded-full px-4 py-1.5 ${mobileView === "main" ? "bg-ink text-paper" : "text-ink"}`}
          >
            {mainTab}
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex min-h-0 flex-1"
        style={{ "--sidew": `${sideW}px` } as React.CSSProperties}
      >
        {sidePosition === "left" ? (
          <>
            {sideSection}
            {handle}
            {mainSection}
          </>
        ) : (
          <>
            {mainSection}
            {handle}
            {sideSection}
          </>
        )}
      </div>

      {mode === "min" && (
        <button
          type="button"
          onClick={() => setMode("split")}
          className="fixed bottom-4 right-4 z-40 hidden h-11 items-center gap-2 rounded-full border border-rule bg-white px-4 text-sm font-medium text-ink shadow-raised hover:border-strategy hover:text-strategy-deep lg:flex"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Show {mainLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}
