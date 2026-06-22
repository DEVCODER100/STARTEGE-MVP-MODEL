"use client";

import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import SuggestionChips from "./SuggestionChips";
import { useChat } from "@/hooks/useChat";

const DEFAULT_CHIPS = [
  "What should I post today?",
  "Write me a hook for my reel",
  "Instagram vs WhatsApp strategy",
  "Run ads on ₹500/day",
  "Caption for my product",
  "Festival marketing tips",
];

export default function ChatInterface({
  greeting,
  subline,
  chips = DEFAULT_CHIPS,
  mode = "coach",
  initialChatId = null,
}: {
  greeting: React.ReactNode;
  subline: string;
  chips?: string[];
  mode?: "coach" | "strategy" | "create";
  initialChatId?: string | null;
}) {
  const { messages, sending, fallback, send, sendBriefAnswer, reset } = useChat({
    mode,
    initialChatId,
  });
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messages.length > 0) setHasStarted(true);
    else setHasStarted(false);
  }, [messages.length]);

  // Listen for "new chat" trigger from the sidebar.
  useEffect(() => {
    const handler = () => {
      reset();
      setHasStarted(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("c");
        window.history.replaceState({}, "", url.toString());
      }
    };
    window.addEventListener("stratege:new-chat", handler);
    return () => window.removeEventListener("stratege:new-chat", handler);
  }, [reset]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const onSend = (text: string, photoUrl?: string) => send(text, photoUrl);

  if (!hasStarted) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[640px] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-card bg-bg-accent-dk border border-accent/20 flex items-center justify-center mb-5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F8A60"
              strokeWidth="1.8"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-text-primary">{greeting}</h1>
          <p className="text-text-secondary text-sm mt-2">{subline}</p>

          <div className="mt-7">
            <SuggestionChips chips={chips} onPick={onSend} />
          </div>

          <div className="w-full max-w-[560px] mt-8">
            <ChatInput onSend={onSend} disabled={sending} autoFocus />
            <p className="text-text-muted text-[11px] mt-3">
              Stratège knows your brand — no need to explain yourself every time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-[720px] mx-auto space-y-5">
          {fallback && (
            <div className="rounded-card border border-accent/30 bg-bg-accent-dk text-accent text-xs px-3 py-2">
              Demo mode — OpenRouter has no credits yet. Replies are placeholders.
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              imageUrl={m.imageUrl}
              imageMeta={m.imageMeta}
              actions={m.actions}
              onBriefAnswer={sendBriefAnswer}
              disabled={sending}
            />
          ))}
          {sending && <ChatMessage role="assistant" content="" pending />}
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 bg-white">
        <div className="max-w-[720px] mx-auto">
          <ChatInput onSend={onSend} disabled={sending} autoFocus />
        </div>
      </div>
    </div>
  );
}
