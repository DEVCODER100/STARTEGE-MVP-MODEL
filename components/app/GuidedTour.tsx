"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

export type TourStep = {
  target?: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  before?: () => void;
};

export default function GuidedTour({
  steps,
  open,
  onClose,
  storageKey,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  storageKey: string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  const measure = useCallback(() => {
    if (!step?.target) return setRect(null);
    const element = document.querySelector(`[data-tour="${step.target}"]`);
    setRect(element?.getBoundingClientRect() || null);
  }, [step]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    step.before?.();
    const timer = window.setTimeout(measure, reduce ? 0 : 220);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [open, step, measure, reduce]);

  if (!open || !step || typeof document === "undefined") return null;

  const finish = () => {
    localStorage.setItem(storageKey, "1");
    onClose();
  };

  const position: CSSProperties = {};
  let transform = "";
  if (!rect || step.placement === "center") {
    position.left = "50%";
    position.top = "50%";
    transform = "translate(-50%, -50%)";
  } else {
    const width = 320;
    const left = Math.min(Math.max(rect.left, 16), window.innerWidth - width - 16);
    if (step.placement === "top") {
      position.left = left;
      position.top = rect.top - 14;
      transform = "translateY(-100%)";
    } else if (step.placement === "left") {
      position.left = Math.max(rect.left - 14, width + 16);
      position.top = Math.max(rect.top, 16);
      transform = "translateX(-100%)";
    } else {
      position.left = left;
      position.top = rect.bottom + 14;
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {!rect && <div className="absolute inset-0 bg-ink/60" />}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-[12px] ring-2 ring-accent"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(23,23,19,.6)",
          }}
        />
      )}
      <motion.div
        key={index}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute w-80 rounded-artifact border border-rule bg-white p-4 shadow-raised"
        style={{ ...position, transform }}
      >
        <div className="flex items-center justify-between">
          <span className="label">Guide · {index + 1} of {steps.length}</span>
          <button onClick={finish} className="text-xs text-muted hover:text-ink">Skip</button>
        </div>
        <h3 className="mt-2 font-display text-lg text-ink">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, item) => <span key={item} className={`h-1.5 rounded-full ${item === index ? "w-5 bg-strategy" : "w-1.5 bg-rule"}`} />)}
          </div>
          <div className="flex gap-2">
            {index > 0 && <button onClick={() => setIndex(index - 1)} className="h-9 rounded-[8px] border border-rule px-3 text-sm">Back</button>}
            <button
              onClick={() => index === steps.length - 1 ? finish() : setIndex(index + 1)}
              className="h-9 rounded-[8px] bg-strategy px-4 text-sm font-medium text-white"
            >
              {index === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
