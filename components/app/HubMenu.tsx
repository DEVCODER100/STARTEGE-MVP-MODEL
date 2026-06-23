"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Label } from "@/components/ui/primitives";

interface ChatSummary { id: string; title: string; }

export default function HubMenu({
  open,
  onOpenChange,
  onStartGuide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartGuide: () => void;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"history" | "library" | "creations" | "guide">("history");
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/chats").then((response) => response.json()).then((data) => setChats(data.chats || [])).catch(() => undefined);
  }, [open]);

  return (
    <div className="relative">
      <button
        data-tour="hub"
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Open history, library and guide"
        className={`flex h-9 w-9 items-center justify-center rounded-[8px] border ${open ? "border-strategy bg-strategy-tint text-strategy" : "border-rule bg-white text-ink"}`}
      >
        <span className="grid grid-cols-2 gap-[2px]">{[0,1,2,3].map((item) => <i key={item} className="h-1 w-1 rounded-[1px] bg-current" />)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button className="fixed inset-0 z-30 cursor-default" onClick={() => onOpenChange(false)} aria-label="Close hub" />
            <motion.div
              data-tour="hubpanel"
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
              className="absolute bottom-12 left-0 z-40 w-80 overflow-hidden rounded-artifact border border-rule bg-white shadow-raised"
            >
              <div className="flex border-b border-rule">
                {(["history", "library", "creations", "guide"] as const).map((item) => (
                  <button key={item} onClick={() => setTab(item)} className={`flex-1 px-2 py-2.5 text-xs font-medium capitalize ${tab === item ? "bg-strategy-tint text-strategy-deep" : "text-muted"}`}>{item}</button>
                ))}
              </div>
              <div className="max-h-72 overflow-auto p-3">
                {tab === "history" && (
                  <div>
                    <Label>Recent conversations</Label>
                    <div className="mt-2">
                      {chats.length ? chats.map((chat) => (
                        <button key={chat.id} onClick={() => { onOpenChange(false); router.push(`/dashboard?c=${chat.id}`); }} className="block w-full rounded-md px-2 py-2 text-left text-sm text-ink hover:bg-canvas">{chat.title}</button>
                      )) : <p className="py-4 text-sm text-muted">Your conversations will appear here.</p>}
                    </div>
                  </div>
                )}
                {tab === "library" && (
                  <div>
                    <Label>Product library</Label>
                    <p className="mt-2 text-sm text-muted">Upload a product image and use it in your next creative conversation.</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const form = new FormData();
                          form.append("file", file);
                          const response = await fetch("/api/upload", { method: "POST", body: form });
                          const data = await response.json();
                          if (data.url) {
                            window.dispatchEvent(new CustomEvent("stratege:prefill", {
                              detail: { text: "Create a visual from this product photo", photoUrl: data.url },
                            }));
                            onOpenChange(false);
                          }
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    <button onClick={() => inputRef.current?.click()} className="mt-3 w-full rounded-[8px] border border-dashed border-rule py-2 text-sm text-muted hover:border-strategy hover:text-strategy">Upload from device</button>
                    {uploading && <p className="mt-2 text-xs text-strategy">Uploading to your conversation…</p>}
                  </div>
                )}
                {tab === "creations" && (
                  <div>
                    <Label>Recent creations</Label>
                    <p className="mt-2 text-sm text-muted">Open a conversation to revisit its posts and generated visuals.</p>
                    <div className="mt-2">
                      {chats.slice(0, 6).map((chat) => (
                        <button key={chat.id} onClick={() => { onOpenChange(false); router.push(`/dashboard?c=${chat.id}`); }} className="block w-full rounded-md border-b border-rule px-2 py-2 text-left text-sm text-ink hover:bg-canvas">{chat.title}</button>
                      ))}
                    </div>
                  </div>
                )}
                {tab === "guide" && (
                  <div className="py-2 text-center">
                    <Label>Need a hand?</Label>
                    <p className="mt-2 text-sm text-muted">Take a quick tour of your strategy desk.</p>
                    <button onClick={() => { onOpenChange(false); onStartGuide(); }} className="mt-3 w-full rounded-[8px] bg-strategy py-2 text-sm font-medium text-white">Start guided tour</button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
