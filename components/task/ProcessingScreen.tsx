"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading your brand…",
  "Analyzing your audience…",
  "Picking the best platform & time…",
  "Writing your caption & hashtags…",
  "Generating your images…",
  "Almost done…",
];

export default function ProcessingScreen() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setI((p) => (p < STEPS.length - 1 ? p + 1 : p));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[420px] text-center">
        <div className="w-12 h-12 mx-auto mb-6 rounded-card bg-bg-accent-dk border border-accent/20 flex items-center justify-center">
          <span className="block w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
        <h2 className="font-display text-2xl text-text-primary">
          Cooking up your task
        </h2>
        <ul className="mt-6 space-y-2 text-sm">
          {STEPS.map((s, idx) => (
            <li
              key={s}
              className={`flex items-center justify-center gap-2 transition-opacity ${
                idx <= i ? "opacity-100" : "opacity-30"
              }`}
            >
              {idx < i ? (
                <span className="text-accent">✓</span>
              ) : idx === i ? (
                <span className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              ) : (
                <span className="w-3 h-3 rounded-full border border-border" />
              )}
              <span
                className={
                  idx === i ? "text-text-primary" : "text-text-secondary"
                }
              >
                {s}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
