"use client";

import ModeTabs from "./ModeTabs";

export default function Header() {
  return (
    <div className="px-6 py-3 border-b border-border bg-white flex items-center justify-between">
      <ModeTabs />
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-bg-accent-dk border border-accent/30 text-accent text-xs font-medium">
          <span>🔥</span> 7 day streak
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New task
        </button>
      </div>
    </div>
  );
}
