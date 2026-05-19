"use client";

import { useState } from "react";

export default function ImageCard({
  urls,
  recommendedIndex = 0,
}: {
  urls: string[];
  recommendedIndex?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(recommendedIndex);

  if (!urls || urls.length === 0) {
    return (
      <div className="bg-white border border-border rounded-card p-5 shadow-card text-center text-text-muted text-sm">
        No image generated.
      </div>
    );
  }

  const download = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `stratege-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const main = urls[active] || urls[0];

  return (
    <div className="bg-white border border-border rounded-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-text-muted text-xs uppercase tracking-wider">
          Recommended image
        </div>
        <span className="text-[10px] text-text-muted">
          {active + 1} of {urls.length}
        </span>
      </div>

      <div className="relative w-full aspect-[4/5] rounded-card overflow-hidden bg-bg-soft border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt="Generated ad"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => download(main)}
          className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card transition-colors"
        >
          Download image
        </button>
        <a
          href={`https://www.canva.com/design/play?create=true&url=${encodeURIComponent(
            main
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-border bg-white text-text-primary text-xs hover:border-accent text-center"
        >
          Edit in Canva
        </a>
      </div>

      {urls.length > 1 && (
        <div className="mt-4">
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            {showAll
              ? "Hide variations"
              : `See ${urls.length - 1} more variation${urls.length - 1 > 1 ? "s" : ""}`}
          </button>
          {showAll && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {urls.map((u, i) => (
                <button
                  key={u + i}
                  onClick={() => setActive(i)}
                  className={`relative aspect-[4/5] rounded-lg overflow-hidden border-2 transition-all ${
                    active === i
                      ? "border-accent"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt={`Variation ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
