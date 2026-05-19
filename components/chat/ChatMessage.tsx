"use client";

import { useState } from "react";
import type { ImageMeta } from "@/hooks/useChat";

export type Role = "user" | "assistant";

export default function ChatMessage({
  role,
  content,
  imageUrl,
  imageMeta,
  pending,
}: {
  role: Role;
  content: string;
  imageUrl?: string | null;
  imageMeta?: ImageMeta | null;
  pending?: boolean;
}) {
  const [url, setUrl] = useState<string | null | undefined>(imageUrl);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(imageMeta?.headline ?? "");
  const [cta, setCta] = useState(imageMeta?.cta ?? "");
  const [busy, setBusy] = useState(false);

  const canEdit = !!url && !!imageMeta?.messageId && !!imageMeta?.baseUrl;

  const saveEdit = async () => {
    if (!imageMeta?.messageId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/image/overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: imageMeta.messageId,
          baseUrl: imageMeta.baseUrl,
          headline,
          cta,
        }),
      });
      const data = await res.json();
      if (data.url) {
        setUrl(data.url);
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-bg-accent-dk text-text-primary text-sm px-4 py-2.5 rounded-card border border-accent/20">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-accent text-white text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
        S
      </div>
      <div className="flex-1 min-w-0">
        {pending ? (
          <div className="flex items-center gap-1.5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        ) : (
          <>
            <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {content}
            </div>

            {url && (
              <div className="mt-3 max-w-[340px]">
                <div className="rounded-card overflow-hidden border border-border bg-bg-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Generated" className="w-full" />
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:text-accent-light"
                  >
                    Open / download
                  </a>
                  {canEdit && !editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-accent hover:text-accent-light"
                    >
                      Edit text
                    </button>
                  )}
                </div>

                {editing && (
                  <div className="mt-3 bg-white border border-border rounded-card p-3 space-y-2">
                    <div>
                      <label className="block text-text-secondary text-[11px] mb-1">
                        Headline
                      </label>
                      <input
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-text-secondary text-[11px] mb-1">
                        CTA (optional)
                      </label>
                      <input
                        value={cta}
                        onChange={(e) => setCta(e.target.value)}
                        placeholder="e.g. Shop Now"
                        className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setEditing(false)}
                        className="flex-1 py-1.5 rounded-lg border border-border text-text-secondary text-xs hover:border-accent"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={busy}
                        className="flex-1 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium disabled:opacity-40"
                      >
                        {busy ? "Rendering…" : "Update image"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
