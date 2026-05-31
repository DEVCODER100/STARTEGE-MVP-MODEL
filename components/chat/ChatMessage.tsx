"use client";

import { useState } from "react";
import type { ImageMeta, MessageActions, BriefField } from "@/hooks/useChat";

export type Role = "user" | "assistant";

type TemplatePreview =
  | "productHero"
  | "editorial"
  | "frame"
  | "fullbleed"
  | "split"
  | "banner"
  | "poster";

function TemplateMockup({ type }: { type?: TemplatePreview }) {
  const visual = "rounded-md bg-gradient-to-br from-accent/25 via-bg-soft to-bg-surface border border-border";
  const text = "rounded-full bg-text-primary/80";
  const cta = "rounded-full bg-accent";

  if (type === "productHero") {
    return (
      <div className="aspect-[4/5] rounded-lg border border-border bg-white p-2.5">
        <div className={`mx-auto h-1.5 w-12 ${cta}`} />
        <div className={`mt-3 h-2.5 w-3/4 mx-auto ${text}`} />
        <div className={`mt-1.5 h-2.5 w-1/2 mx-auto ${text}`} />
        <div className={`mt-2 h-3.5 w-16 mx-auto ${cta}`} />
        <div className={`mt-5 h-[42%] w-full ${visual}`} />
      </div>
    );
  }

  if (type === "frame") {
    return (
      <div className="aspect-[4/5] rounded-lg bg-accent p-2.5">
        <div className={`h-[58%] w-full ${visual} bg-white/90`} />
        <div className="mt-4 h-2.5 w-4/5 mx-auto rounded-full bg-white" />
        <div className="mt-1.5 h-2.5 w-1/2 mx-auto rounded-full bg-white/80" />
        <div className="mt-3 h-3.5 w-16 mx-auto rounded-full bg-white" />
      </div>
    );
  }

  if (type === "fullbleed") {
    return (
      <div className={`aspect-[4/5] rounded-lg overflow-hidden ${visual} relative`}>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute left-4 right-4 bottom-8 space-y-1.5">
          <div className="h-2.5 w-5/6 rounded-full bg-white" />
          <div className="h-2.5 w-2/3 rounded-full bg-white/80" />
          <div className="mt-3 h-3.5 w-20 rounded-full border border-white" />
        </div>
      </div>
    );
  }

  if (type === "split") {
    return (
      <div className="aspect-[4/5] rounded-lg overflow-hidden border border-border bg-white grid grid-cols-[55%_45%]">
        <div className="p-3 flex flex-col justify-center">
          <div className="h-12 w-1 bg-accent" />
          <div className={`mt-3 h-2.5 w-5/6 ${text}`} />
          <div className={`mt-1.5 h-2.5 w-2/3 ${text}`} />
          <div className={`mt-3 h-3.5 w-14 ${cta}`} />
        </div>
        <div className={`${visual} rounded-none border-0`} />
      </div>
    );
  }

  if (type === "banner") {
    return (
      <div className="aspect-[4/5] rounded-lg overflow-hidden border border-border bg-white">
        <div className="h-[40%] bg-accent p-4">
          <div className="h-2.5 w-5/6 rounded-full bg-white" />
          <div className="mt-1.5 h-2.5 w-2/3 rounded-full bg-white/80" />
          <div className="mt-3 h-3.5 w-16 rounded-full bg-white" />
        </div>
        <div className={`h-[60%] ${visual} rounded-none border-0`} />
      </div>
    );
  }

  if (type === "poster") {
    return (
      <div className="aspect-[4/5] rounded-lg bg-accent p-4">
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-white" />
          <div className="h-3 w-4/5 rounded-full bg-white/85" />
          <div className="h-3 w-2/3 rounded-full bg-white/70" />
        </div>
        <div className="mt-8 h-20 w-20 rounded-full bg-white/85 mx-auto" />
        <div className="mt-5 h-3 w-20 rounded-full bg-white mx-auto" />
      </div>
    );
  }

  return (
    <div className="aspect-[4/5] rounded-lg border border-border bg-white p-2.5">
      <div className={`h-[50%] w-full ${visual}`} />
      <div className={`mt-5 h-2.5 w-5/6 mx-auto ${text}`} />
      <div className={`mt-1.5 h-2.5 w-2/3 mx-auto ${text}`} />
      <div className={`mt-3 h-3.5 w-16 mx-auto ${cta}`} />
    </div>
  );
}

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

            {actions && actions.options.length > 0 && (
              <div
                className={
                  actions.field === "template"
                    ? "mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                    : "mt-3 flex flex-wrap gap-2"
                }
              >
                {actions.options.map((opt) => {
                  const isPicked = actions.resolvedValue === opt.value;
                  const someoneElsePicked =
                    !!actions.resolvedValue && !isPicked;
                  if (actions.field === "template") {
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
                        className={`group rounded-card border bg-white p-3 text-left transition-colors ${
                          isPicked
                            ? "border-accent ring-1 ring-accent/20"
                            : someoneElsePicked
                              ? "border-border opacity-50"
                              : "border-border hover:border-accent disabled:opacity-50"
                        }`}
                      >
                        <div className="grid grid-cols-[78px_1fr] gap-3 items-center">
                          <TemplateMockup type={opt.preview} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-primary">
                              {opt.label}
                            </div>
                            {opt.description && (
                              <div className="mt-1 text-xs leading-relaxed text-text-secondary">
                                {opt.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  }
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
                      } ${
                        actions.field === "hook" && opt.isHookText
                          ? "max-w-full whitespace-normal text-left"
                          : ""
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
