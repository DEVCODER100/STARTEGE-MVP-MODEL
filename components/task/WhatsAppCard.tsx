"use client";

import { useState } from "react";

export default function WhatsAppCard({
  status,
  broadcast,
}: {
  status: string;
  broadcast: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  if (!status && !broadcast) return null;

  return (
    <div className="bg-white border border-border rounded-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">💬</span>
        <div className="text-text-muted text-xs uppercase tracking-wider">
          WhatsApp
        </div>
      </div>

      {status && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs">Status</span>
            <button
              onClick={() => copy("status", status)}
              className="text-xs text-accent hover:text-accent-light"
            >
              {copied === "status" ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="text-text-primary text-sm bg-bg-soft border border-border rounded-lg px-3 py-2 whitespace-pre-wrap">
            {status}
          </p>
        </div>
      )}

      {broadcast && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs">Broadcast message</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => copy("bc", broadcast)}
                className="text-xs text-accent hover:text-accent-light"
              >
                {copied === "bc" ? "Copied ✓" : "Copy"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(broadcast)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent-light"
              >
                Open WhatsApp →
              </a>
            </div>
          </div>
          <p className="text-text-primary text-sm bg-bg-soft border border-border rounded-lg px-3 py-2 whitespace-pre-wrap">
            {broadcast}
          </p>
        </div>
      )}
    </div>
  );
}
