"use client";

import ModeTabs from "./ModeTabs";

type Mode = "coach" | "strategy" | "create";

export default function Header({
  mode,
  onModeChange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  return (
    <div className="px-6 py-3 border-b border-border bg-white flex items-center justify-between">
      <ModeTabs value={mode} onChange={onModeChange} />
      <div className="text-text-muted text-xs hidden sm:block">
        {mode === "coach" && "Ask anything about marketing"}
        {mode === "strategy" && "Plan your next campaign step by step"}
        {mode === "create" && "Generate posts, captions & images"}
      </div>
    </div>
  );
}
