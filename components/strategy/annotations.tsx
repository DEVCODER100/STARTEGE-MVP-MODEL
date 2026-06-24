"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

// Numbered strategic decision — the editorial "marked-up brief" motif.
export function NumberedDecision({
  n,
  title,
  children,
  className,
}: {
  n: number;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative pl-12", className)}>
      <span
        className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-strategy bg-white font-mono text-sm font-medium text-strategy-deep"
        aria-hidden
      >
        {String(n).padStart(2, "0")}
      </span>
      <h4 className="text-[1.02rem] font-medium leading-snug text-ink">{title}</h4>
      {children && <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

// Fine-lined margin note — "why this" reasoning beside the work.
export function MarginNote({
  children,
  label = "Why this",
  tone = "strategy",
}: {
  children: ReactNode;
  label?: string;
  tone?: "strategy" | "accent";
}) {
  const bar = tone === "accent" ? "bg-accent" : "bg-strategy";
  const text = tone === "accent" ? "text-accent" : "text-strategy-deep";
  return (
    <aside className="relative flex gap-3 pl-px">
      <span className={cn("mt-0.5 w-[3px] shrink-0 rounded-full", bar)} aria-hidden />
      <div>
        <span className={cn("label", text)}>{label}</span>
        <p className="mt-1 font-display text-[0.95rem] italic leading-relaxed text-ink/80">
          {children}
        </p>
      </div>
    </aside>
  );
}

// Small green "why this works" callout chip.
export function WhyThisCallout({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-strategy/30 bg-strategy-tint px-3 py-1 text-sm text-strategy-deep">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 7.2v3.4M8 5.1v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {children}
    </span>
  );
}

// Hand-drawn-feel underline beneath a key phrase, with an animated draw-in.
export function InkUnderline({
  children,
  tone = "strategy",
  delay = 0.2,
}: {
  children: ReactNode;
  tone?: "strategy" | "accent";
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const color = tone === "accent" ? "#E8793B" : "#087A55";
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <svg
        className="absolute -bottom-1 left-0 w-full"
        height="8"
        viewBox="0 0 200 8"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d="M2 5 C 50 7, 150 2, 198 5"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </span>
  );
}
