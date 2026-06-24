"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { angles, samplePost } from "@/lib/brand";
import { Label } from "@/components/ui/primitives";

// Calm, looping 5-step demonstration: typed moment -> angles -> selection ->
// assembled artifact -> reasoning. ~13s loop. Reduced-motion shows final state.
const TYPED = "We packed our first 100 orders today.";

const ease = [0.22, 1, 0.36, 1] as const;

export function TransformationDemo() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0); // 0 type, 1 angles, 2 select, 3 assemble, 4 reason
  const [typed, setTyped] = useState("");
  const [runKey, setRunKey] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const restart = () => setRunKey((k) => k + 1);

  useEffect(() => {
    // Reduced motion: jump straight to the finished state, no loop.
    if (reduce) {
      setTyped(TYPED);
      setStep(4);
      return;
    }

    clear();
    setTyped("");
    setStep(0);

    // Typewriter
    let i = 0;
    const type = () => {
      i += 1;
      setTyped(TYPED.slice(0, i));
      if (i < TYPED.length) {
        timers.current.push(window.setTimeout(type, 45));
      } else {
        timers.current.push(window.setTimeout(() => setStep(1), 700));
      }
    };
    timers.current.push(window.setTimeout(type, 500));

    // Choreography
    timers.current.push(window.setTimeout(() => setStep(2), 4200));
    timers.current.push(window.setTimeout(() => setStep(3), 5400));
    timers.current.push(window.setTimeout(() => setStep(4), 8200));
    // Loop
    timers.current.push(window.setTimeout(restart, 13500));

    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, runKey]);

  return (
    <div className="relative">
      {/* Floating "brand detail" tag that connects to the output */}
      <div className="rounded-artifact border border-rule bg-canvas shadow-raised">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-strategy-tint">
              <svg width="11" height="11" viewBox="0 0 32 32" fill="none">
                <path d="M7 14.5 L16 6.5 L25 14.5" stroke="#087A55" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 24 L16 16 L25 24" stroke="#087A55" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
              </svg>
            </span>
            <span className="font-mono text-xs text-muted">stratège · the desk</span>
          </div>
          <button
            onClick={restart}
            className="flex items-center gap-1 rounded-full border border-rule bg-white px-2 py-0.5 text-xs text-muted hover:text-ink"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5V5h-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Replay
          </button>
        </div>

        <div className="min-h-[440px] space-y-4 p-4 sm:p-5">
          {/* Step 0: typed moment */}
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-paper">
              A
            </span>
            <div className="flex-1 rounded-[10px] rounded-tl-sm bg-white px-3.5 py-2.5 text-[0.95rem] text-ink shadow-sm">
              {typed}
              {step === 0 && !reduce && (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-strategy align-middle" />
              )}
            </div>
          </div>

          {/* Step 1+: angles extracted */}
          <AnimatePresence>
            {step >= 1 && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease }}
              >
                <Label>Stratège found 3 story angles</Label>
                <div className="mt-2 grid gap-2">
                  {angles.map((a, idx) => {
                    const isChosen = a.recommended;
                    const dim = step >= 2 && !isChosen;
                    const highlight = step >= 2 && isChosen;
                    return (
                      <motion.div
                        key={a.id}
                        initial={reduce ? false : { opacity: 0, x: -8 }}
                        animate={{
                          opacity: dim ? 0.4 : 1,
                          x: 0,
                          scale: highlight ? 1.0 : 1,
                        }}
                        transition={{ duration: 0.35, delay: reduce ? 0 : idx * 0.12, ease }}
                        className={`relative rounded-[10px] border px-3 py-2 ${
                          highlight
                            ? "border-strategy bg-strategy-tint ring-1 ring-strategy"
                            : "border-rule bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink">{a.label}</span>
                          {highlight ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-strategy-deep">
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8.5 6.2 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Selected
                            </span>
                          ) : a.recommended ? (
                            <span className="rounded-full bg-accent-tint px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-accent">
                              Recommended
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{a.blurb}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3+: assembled artifact */}
          <AnimatePresence>
            {step >= 3 && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease }}
                className="overflow-hidden rounded-[12px] border border-rule bg-white shadow-artifact"
              >
                <div className="flex items-center justify-between border-b border-rule px-3.5 py-2">
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                    {samplePost.platform}
                  </span>
                  <span className="rounded-full border border-accent/30 bg-accent-tint px-2 py-0.5 text-[0.65rem] font-medium text-accent">
                    Ready to review
                  </span>
                </div>
                <div className="space-y-2.5 p-3.5">
                  {[
                    { l: "Hook", v: samplePost.hook },
                    { l: "Caption", v: "Today we packed our first 100 orders. Every Dabu bedcover checked, folded and wrapped by the same small team that printed it…" },
                    { l: "Visual direction", v: samplePost.visual },
                    { l: "Best time to post", v: samplePost.postingTime },
                  ].map((b, i) => (
                    <motion.div
                      key={b.l}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.18, ease }}
                    >
                      <span className="font-mono text-[0.62rem] uppercase tracking-wider text-muted">
                        {b.l}
                      </span>
                      <p className={`text-sm leading-snug ${b.l === "Best time to post" ? "text-strategy-deep font-medium" : "text-ink"}`}>
                        {b.v}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 4: reasoning */}
          <AnimatePresence>
            {step >= 4 && (
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease }}
                className="flex items-start gap-2 rounded-[10px] border border-strategy/25 bg-strategy-tint px-3 py-2"
              >
                <span className="mt-0.5 w-[3px] shrink-0 self-stretch rounded-full bg-strategy" />
                <p className="text-xs leading-relaxed text-strategy-deep">
                  <span className="font-mono uppercase tracking-wider opacity-70">Why this</span>
                  <br />
                  Recommended because this brand&apos;s audience responds to{" "}
                  <span className="font-medium">founder-led stories</span>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
