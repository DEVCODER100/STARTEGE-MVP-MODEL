"use client";

import { useState } from "react";

const OPTIONS: {
  value: "orders" | "likes" | "nothing";
  label: string;
  emoji: string;
}[] = [
  { value: "orders", label: "Got orders", emoji: "💰" },
  { value: "likes", label: "Got likes", emoji: "❤️" },
  { value: "nothing", label: "Nothing", emoji: "🤷" },
];

export default function FeedbackButtons({
  current,
  onPick,
}: {
  current?: string | null;
  onPick: (value: "orders" | "likes" | "nothing") => void;
}) {
  const [picked, setPicked] = useState<string | null>(current ?? null);
  const select = (v: "orders" | "likes" | "nothing") => {
    setPicked(v);
    onPick(v);
  };

  return (
    <div className="bg-white border border-border rounded-card p-5 shadow-card">
      <div className="text-text-muted text-xs uppercase tracking-wider mb-3">
        How did it perform?
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const on = picked === o.value;
          return (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-colors ${
                on
                  ? "bg-bg-accent-dk border-accent text-accent"
                  : "bg-white border-border text-text-secondary hover:border-accent"
              }`}
            >
              <span className="text-lg">{o.emoji}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
