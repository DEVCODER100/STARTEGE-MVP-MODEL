"use client";

import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import SuggestionChips from "./SuggestionChips";
import { useChat } from "@/hooks/useChat";

const DEFAULT_CHIPS = [
  "What should I post today?",
  "Write me a hook for my reel",
  "Create a visual for my product",
];

export default function ChatInterface({
  greeting,
  subline,
  chips = DEFAULT_CHIPS,
  mode = "coach",
  initialChatId = null,
  desk = false,
}: {
  greeting: React.ReactNode;
  subline: string;
  chips?: string[];
  mode?: "coach" | "strategy" | "create";
  initialChatId?: string | null;
  desk?: boolean;
}) {
  const { messages, sending, fallback, send, sendBriefAnswer, reset } = useChat({
    mode,
    initialChatId,
  });
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setHasStarted(messages.length > 0), [messages.length]);

  useEffect(() => {
    const handler = () => {
      reset();
      setHasStarted(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("c");
      window.history.replaceState({}, "", url.toString());
    };
    window.addEventListener("stratege:new-chat", handler);
    return () => window.removeEventListener("stratege:new-chat", handler);
  }, [reset]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const onSend = (text: string, photoUrl?: string) => send(text, photoUrl);

  if (!hasStarted) {
    return (
      <div className={desk ? "flex min-h-0 flex-1 flex-col" : "flex flex-1 items-center justify-center px-6 py-10"}>
        <div className={desk ? "flex min-h-0 flex-1 flex-col" : "flex w-full max-w-[640px] flex-col items-center text-center"}>
          <div className={desk ? "flex-1 overflow-auto p-4" : ""}>
            <div className={desk ? "rounded-card rounded-tl-sm border border-rule bg-white p-4 shadow-sm" : ""}>
              {!desk && <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-card border border-strategy/20 bg-strategy-tint font-display text-strategy">S</div>}
              <h1 className={desk ? "font-display text-xl text-ink" : "font-display text-3xl text-ink"}>{greeting}</h1>
              <p className={desk ? "mt-1.5 text-sm leading-relaxed text-muted" : "mt-2 text-sm text-muted"}>{subline}</p>
            </div>
            <div className={desk ? "mt-4" : "mt-7"}>
              <SuggestionChips chips={chips} onPick={onSend} />
            </div>
          </div>
          <div className={desk ? "border-t border-rule bg-white p-3" : "mt-8 w-full max-w-[560px]"}>
            <ChatInput onSend={onSend} disabled={sending} autoFocus />
            {!desk && <p className="mt-3 text-[11px] text-muted">Stratège knows your brand — no need to explain yourself every time.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation"
        className={desk ? "flex-1 overflow-y-auto p-4" : "flex-1 overflow-y-auto px-6 py-8"}
      >
        <div className={desk ? "space-y-4" : "mx-auto max-w-[720px] space-y-5"}>
          {fallback && (
            <div className="rounded-card border border-accent/30 bg-accent-tint px-3 py-2 text-xs text-accent">
              Demo mode — the AI provider is unavailable, so this reply is a placeholder.
            </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              imageUrl={message.imageUrl}
              imageMeta={message.imageMeta}
              actions={message.actions}
              onBriefAnswer={sendBriefAnswer}
              disabled={sending}
            />
          ))}
          {sending && <ChatMessage role="assistant" content="" pending />}
        </div>
      </div>
      <div className={desk ? "border-t border-rule bg-white p-3" : "border-t border-rule bg-white px-6 py-4"}>
        <div className={desk ? "" : "mx-auto max-w-[720px]"}>
          <ChatInput onSend={onSend} disabled={sending} autoFocus />
        </div>
      </div>
    </div>
  );
}
