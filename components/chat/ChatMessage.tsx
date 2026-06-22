"use client";

import { useState } from "react";
import type { ImageMeta, MessageActions, BriefField } from "@/hooks/useChat";

export type Role = "user" | "assistant";

export default function ChatMessage({
  role,
  content,
  imageUrl,
  imageMeta,
  actions,
  pending,
  onBriefAnswer,
  disabled,
}: {
  role: Role;
  content: string;
  imageUrl?: string | null;
  imageMeta?: ImageMeta | null;
  actions?: MessageActions | null;
  pending?: boolean;
  onBriefAnswer?: (
    field: BriefField,
    value: string,
    label: string,
    fromMessageId?: string
  ) => void;
  disabled?: boolean;
}) {
  const isV2 = imageMeta?.v === 2;
  const [url, setUrl] = useState<string | null | undefined>(imageUrl);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(
    imageMeta?.copy?.headline ?? imageMeta?.headline ?? ""
  );
  const [subhead, setSubhead] = useState(imageMeta?.copy?.subhead ?? "");
  const [cta, setCta] = useState(imageMeta?.copy?.cta ?? imageMeta?.cta ?? "");
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canEditV2 = !!url && isV2 && !!imageMeta?.messageId;
  const canEditLegacy =
    !!url && !isV2 && !!imageMeta?.messageId && !!imageMeta?.baseUrl;
  const canEdit = canEditV2 || canEditLegacy;

  const saveEdit = async () => {
    if (!imageMeta?.messageId) return;
    setBusy(true);
    setEditError(null);
    try {
      const endpoint = canEditV2 ? "/api/image/regenerate" : "/api/image/overlay";
      const body = canEditV2
        ? { messageId: imageMeta.messageId, headline, subhead, cta }
        : {
            messageId: imageMeta.messageId,
            baseUrl: imageMeta.baseUrl,
            headline,
            cta,
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) {
        setUrl(data.url);
        setEditing(false);
      } else {
        setEditError(data.error || "Couldn't update the image.");
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

            {actions && actions.options.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.options.map((opt) => {
                  const isPicked = actions.resolvedValue === opt.value;
                  const someoneElsePicked = !!actions.resolvedValue && !isPicked;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        onBriefAnswer?.(
                          actions.field,
                          opt.value,
                          opt.label,
                          actions.messageId
                        )
                      }
                      disabled={!!disabled || !!actions.resolvedValue}
                      className={`text-xs px-3 py-1.5 rounded-pill border transition-colors ${
                        isPicked
                          ? "bg-accent text-white border-accent"
                          : someoneElsePicked
                            ? "border-border text-text-muted opacity-50"
                            : "border-border text-text-primary hover:border-accent hover:text-accent disabled:opacity-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {url && (
              <div className="mt-3 max-w-[340px]">
                <div className="rounded-card overflow-hidden border border-border bg-bg-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Generated ad" className="w-full" />
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
                    {canEditV2 && (
                      <div>
                        <label className="block text-text-secondary text-[11px] mb-1">
                          Subheadline
                        </label>
                        <input
                          value={subhead}
                          onChange={(e) => setSubhead(e.target.value)}
                          className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
                        />
                      </div>
                    )}
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
                    {canEditV2 && (
                      <p className="text-text-muted text-[11px]">
                        Editing regenerates the ad and uses one of today&apos;s
                        image credits.
                      </p>
                    )}
                    {editError && (
                      <p className="text-red-500 text-[11px]">{editError}</p>
                    )}
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
