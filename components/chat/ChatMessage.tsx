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
        <div className="max-w-[85%] rounded-card rounded-tr-sm bg-ink px-3.5 py-2.5 text-sm text-paper">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-strategy-tint text-xs font-medium text-strategy-deep">
        S
      </div>
      <div className="flex-1 min-w-0">
        {pending ? (
          <div className="flex items-center gap-1.5 py-2" role="status" aria-label="Stratège is thinking">
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
            <div className="whitespace-pre-wrap rounded-card rounded-tl-sm border border-rule bg-white p-3.5 text-sm leading-relaxed text-ink shadow-sm">
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
                          ? "border-strategy bg-strategy-tint font-medium text-strategy-deep ring-1 ring-strategy"
                          : someoneElsePicked
                            ? "border-rule text-muted opacity-50"
                            : "border-rule bg-white text-ink hover:border-strategy hover:text-strategy-deep disabled:opacity-50"
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
                <div className="overflow-hidden rounded-artifact border border-rule bg-canvas shadow-artifact">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Generated ad" className="w-full" />
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-strategy hover:text-strategy-deep"
                  >
                    Open / download
                  </a>
                  {canEdit && !editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs font-medium text-strategy hover:text-strategy-deep"
                    >
                      Edit text
                    </button>
                  )}
                </div>

                {editing && (
                  <div className="mt-3 space-y-2 rounded-card border border-rule bg-white p-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted">
                        Headline
                      </label>
                      <input
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full rounded-[8px] border border-rule bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-strategy"
                      />
                    </div>
                    {canEditV2 && (
                      <div>
                        <label className="mb-1 block text-[11px] text-muted">
                          Subheadline
                        </label>
                        <input
                          value={subhead}
                          onChange={(e) => setSubhead(e.target.value)}
                          className="w-full rounded-[8px] border border-rule bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-strategy"
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-[11px] text-muted">
                        CTA (optional)
                      </label>
                      <input
                        value={cta}
                        onChange={(e) => setCta(e.target.value)}
                        placeholder="e.g. Shop Now"
                        className="w-full rounded-[8px] border border-rule bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-strategy"
                      />
                    </div>
                    {canEditV2 && (
                      <p className="text-[11px] text-muted">
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
                        className="flex-1 rounded-[8px] border border-rule py-1.5 text-xs text-muted hover:border-strategy"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={busy}
                        className="flex-1 rounded-[8px] bg-strategy py-1.5 text-xs font-medium text-white hover:bg-strategy-deep disabled:opacity-40"
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
