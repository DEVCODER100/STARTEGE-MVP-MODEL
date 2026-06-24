"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask anything, or describe a product to make an ad…",
  initial = "",
  autoFocus = false,
}: {
  onSend: (text: string, photoUrl?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initial?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Grow the textarea with its content, up to a max height, then scroll.
  const MAX_H = 168;
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, MAX_H) + "px";
  };
  useEffect(() => {
    autoGrow();
  }, [text]);

  useEffect(() => {
    const handler = (event: Event) => {
      const value = (event as CustomEvent<string | { text?: string; photoUrl?: string }>).detail;
      if (typeof value === "string") setText(value);
      else if (value) {
        if (value.text) setText(value.text);
        if (value.photoUrl) setPhotoUrl(value.photoUrl);
      }
    };
    window.addEventListener("stratege:prefill", handler);
    return () => window.removeEventListener("stratege:prefill", handler);
  }, []);

  const send = () => {
    const v = text.trim();
    if ((!v && !photoUrl) || disabled || uploading) return;
    onSend(v, photoUrl ?? undefined);
    setText("");
    setPhotoUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image too large (max 8 MB).");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {(photoUrl || uploading || uploadError) && (
        <div className="flex items-center gap-2 text-xs">
          {uploading && <span className="text-muted">Uploading photo…</span>}
          {uploadError && <span className="text-red-500">{uploadError}</span>}
          {photoUrl && !uploading && (
            <div className="flex items-center gap-2 rounded-[8px] border border-rule bg-canvas py-1 pl-1.5 pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="product" className="w-8 h-8 rounded object-cover" />
              <span className="text-muted">Product photo attached</span>
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-muted hover:text-ink"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-card border border-rule bg-white px-2.5 py-2 shadow-sm transition-all focus-within:border-strategy focus-within:shadow-focus">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          title="Attach a product photo"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-rule text-muted hover:border-strategy hover:text-strategy disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          ref={taRef}
          autoFocus={autoFocus}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 resize-none self-center border-0 bg-transparent py-1.5 text-sm leading-relaxed text-ink outline-none placeholder:text-muted disabled:opacity-50"
          style={{ boxShadow: "none", maxHeight: MAX_H }}
        />
        <button
          type="button"
          onClick={send}
          disabled={(!text.trim() && !photoUrl) || disabled || uploading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-strategy text-white hover:bg-strategy-deep disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
