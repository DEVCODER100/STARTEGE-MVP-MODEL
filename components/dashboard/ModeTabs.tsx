"use client";

import { useState } from "react";

type Mode = "coach" | "strategy" | "create";

const MODES: { id: Mode; label: string }[] = [
  { id: "coach", label: "Coach" },
  { id: "strategy", label: "Strategy" },
  { id: "create", label: "Create" },
];

export default function ModeTabs({
  value,
  onChange,
}: {
  value?: Mode;
  onChange?: (m: Mode) => void;
}) {
  const [internal, setInternal] = useState<Mode>("coach");
  const v = value ?? internal;
  const set = (m: Mode) => {
    setInternal(m);
    onChange?.(m);
  };

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-pill bg-bg-soft border border-border">
      {MODES.map((m) => {
        const active = v === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => set(m.id)}
            className={`px-3 py-1 rounded-pill text-xs transition-colors ${
              active
                ? "bg-white text-text-primary shadow-card"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
