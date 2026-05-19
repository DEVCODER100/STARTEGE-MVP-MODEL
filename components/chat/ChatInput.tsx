"use client";

import { useState } from "react";

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask anything about marketing your brand…",
  initial = "",
  autoFocus = false,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initial?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initial);

  const send = () => {
    const v = text.trim();
    if (!v || disabled) return;
    onSend(v);
    setText("");
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-border rounded-card px-3 py-2.5 shadow-card focus-within:border-accent focus-within:shadow-focus transition-all">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8A8A82"
        strokeWidth="1.8"
      >
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
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
        disabled={!text.trim() || disabled}
        className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-light text-white flex items-center justify-center disabled:opacity-40 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
