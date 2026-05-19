"use client";

import { useState } from "react";
import Header from "./Header";
import ChatInterface from "@/components/chat/ChatInterface";

export type Mode = "coach" | "strategy" | "create";

// Owns the active mode so the Header tabs and the chat actually share it.
export default function DashboardChat({
  greeting,
  subline,
  chips,
  initialChatId,
}: {
  greeting: React.ReactNode;
  subline: string;
  chips: string[];
  initialChatId: string | null;
}) {
  const [mode, setMode] = useState<Mode>("coach");

  return (
    <>
      <Header mode={mode} onModeChange={setMode} />
      <ChatInterface
        key={initialChatId ?? "new"}
        mode={mode}
        greeting={greeting}
        subline={subline}
        chips={chips}
        initialChatId={initialChatId}
      />
    </>
  );
}
