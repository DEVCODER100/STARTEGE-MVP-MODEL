"use client";

import { useRef, useState } from "react";

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
          {uploading && <span className="text-text-muted">Uploading photo…</span>}
          {uploadError && <span className="text-red-500">{uploadError}</span>}
          {photoUrl && !uploading && (
            <div className="flex items-center gap-2 bg-bg-soft border border-border rounded-lg pl-1.5 pr-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="product" className="w-8 h-8 rounded object-cover" />
              <span className="text-text-secondary">Product photo attached</span>
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-text-muted hover:text-text-primary"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 bg-white border border-border rounded-card px-3 py-2.5 shadow-card focus-within:border-accent focus-within:shadow-focus transition-all">
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
          className="w-8 h-8 rounded-lg text-text-muted hover:text-accent hover:bg-bg-soft flex items-center justify-center disabled:opacity-40 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50"
          style={{ boxShadow: "none" }}
        />
        <button
          type="button"
          onClick={send}
          disabled={(!text.trim() && !photoUrl) || disabled || uploading}
          className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-light text-white flex items-center justify-center disabled:opacity-40 transition-colors"
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
