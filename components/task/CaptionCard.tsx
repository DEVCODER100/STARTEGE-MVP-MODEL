"use client";

import { useState } from "react";

export default function CaptionCard({
  caption,
  hashtags,
}: {
  caption: string;
  hashtags: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const text = `${caption}\n\n${hashtags}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="bg-white border border-border rounded-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-text-muted text-xs uppercase tracking-wider">
          Caption
        </div>
        <button
          onClick={copyAll}
          className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card transition-colors"
        >
          {copied ? "Copied ✓" : "Copy everything"}
        </button>
      </div>
      <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">
        {caption}
      </p>
      <div className="mt-4 pt-4 border-t border-border text-text-secondary text-xs leading-relaxed break-words">
        {hashtags}
      </div>
    </div>
  );
}
