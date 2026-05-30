"use client";

import { useCallback, useEffect, useState } from "react";

export type Role = "user" | "assistant";

export interface ImageMeta {
  baseUrl: string;
  headline: string;
  cta: string;
  messageId?: string;
}

export type BriefField = "template" | "hook" | "color";
export interface MessageActions {
  field: BriefField;
  intro?: string;
  options: { label: string; value: string; isHookText?: boolean }[];
  messageId?: string;
  resolvedValue?: string;
}

export interface Message {
  role: Role;
  content: string;
  imageUrl?: string | null;
  imageMeta?: ImageMeta | null;
  actions?: MessageActions | null;
}
export interface Usage {
  posts: { used: number; limit: number; remaining: number };
  images: { used: number; limit: number; remaining: number };
}

export interface UseChatResult {
  messages: Message[];
  sending: boolean;
  fallback: boolean;
  error: string | null;
  chatId: string | null;
  usage: Usage | null;
  send: (text: string) => Promise<void>;
  sendBriefAnswer: (
    field: BriefField,
    value: string,
    label: string,
    fromMessageId?: string
  ) => Promise<void>;
  reset: () => void;
}

export function useChat({
  mode = "coach",
  initialChatId = null,
}: {
  mode?: "coach" | "strategy" | "create";
  initialChatId?: string | null;
} = {}): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const [sending, setSending] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    if (!initialChatId) {
      setMessages([]);
      setChatId(null);
      return;
    }
    let alive = true;
    setChatId(initialChatId);
    fetch(`/api/chats/${initialChatId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !data.messages) return;
        setMessages(
          data.messages.map(
            (m: {
              id: string;
              role: Role;
              content: string;
              image_url?: string;
              image_meta?: Omit<ImageMeta, "messageId"> | null;
              actions?: Omit<MessageActions, "messageId"> | null;
            }) => ({
              role: m.role,
              content: m.content,
              imageUrl: m.image_url ?? null,
              imageMeta: m.image_meta
                ? { ...m.image_meta, messageId: m.id }
                : null,
              actions: m.actions
                ? { ...m.actions, messageId: m.id }
                : null,
            })
          )
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initialChatId]);

  const post = useCallback(
    async (
      userMsg: Message,
      briefAnswer?: { field: BriefField; value: string } | null,
      markAnsweredOnMessageId?: string
    ) => {
      const next = [...messages, userMsg];
      setMessages(next);
      setSending(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            messages: next.map((m) => ({ role: m.role, content: m.content })),
            chatId,
            briefAnswer: briefAnswer ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok && !data.reply) {
          throw new Error(data.error || `Server ${res.status}`);
        }

        if (data.chatId && data.chatId !== chatId) {
          setChatId(data.chatId);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("c", data.chatId);
            window.history.replaceState({}, "", url.toString());
          }
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("stratege:chats-changed"));
        }

        setFallback(!!data.fallback);
        if (data.usage) setUsage(data.usage);
        setMessages((m) => {
          // Optimistically mark the previous chip set as answered.
          const updated = markAnsweredOnMessageId
            ? m.map((msg) =>
                msg.actions?.messageId === markAnsweredOnMessageId
                  ? {
                      ...msg,
                      actions: {
                        ...msg.actions,
                        resolvedValue: briefAnswer?.value,
                      },
                    }
                  : msg
              )
            : m;
          return [
            ...updated,
            {
              role: "assistant",
              content: data.reply,
              imageUrl: data.imageUrl ?? null,
              imageMeta: data.imageMeta ?? null,
              actions: data.actions ?? null,
            },
          ];
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to send";
        setError(msg);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Sorry — I hit an error: ${msg}` },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, mode, chatId]
  );

  const send = useCallback(
    async (text: string) => {
      await post({ role: "user", content: text });
    },
    [post]
  );

  const sendBriefAnswer = useCallback(
    async (
      field: BriefField,
      value: string,
      label: string,
      fromMessageId?: string
    ) => {
      await post(
        { role: "user", content: label },
        { field, value },
        fromMessageId
      );
    },
    [post]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setChatId(null);
    setError(null);
    setFallback(false);
  }, []);

  return {
    messages,
    sending,
    fallback,
    error,
    chatId,
    usage,
    send,
    sendBriefAnswer,
    reset,
  };
}
