"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Label } from "@/components/ui/primitives";

interface ChatSummary {
  id: string;
  title: string;
  updated_at: string;
}

const NAV = [
  ["/dashboard", "The desk"],
  ["/task", "Image studio"],
  ["/brand", "Brand book"],
  ["/upgrade", "Plans"],
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get("c");
  const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const loadChats = useCallback(() => {
    fetch("/api/chats")
      .then((response) => response.json())
      .then((data) => Array.isArray(data.chats) && setChats(data.chats))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadChats();
    window.addEventListener("stratege:chats-changed", loadChats);
    return () => window.removeEventListener("stratege:chats-changed", loadChats);
  }, [loadChats]);

  const newChat = () => {
    window.dispatchEvent(new CustomEvent("stratege:new-chat"));
    if (pathname !== "/dashboard" || activeChatId) router.push("/dashboard");
  };

  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "Founder";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-rule bg-paper/75 lg:flex">
      <Link href="/" className="flex h-14 items-center gap-2 border-b border-rule px-4">
        <LogoMark size={24} />
        <span className="font-display text-lg text-ink">Stratège</span>
      </Link>

      <div className="px-3 py-3">
        <button
          onClick={newChat}
          className="flex w-full items-center gap-2 rounded-[9px] bg-strategy px-3 py-2 text-sm font-medium text-white hover:bg-strategy-deep"
        >
          <span className="text-lg leading-none">+</span>
          New work
        </button>
      </div>

      <nav className="px-2">
        {NAV.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`mb-0.5 flex min-h-10 items-center rounded-md px-3 text-sm ${
              pathname === href
                ? "bg-white font-medium text-ink shadow-sm"
                : "text-ink/75 hover:bg-white/60"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 px-4"><Label>Recent work</Label></div>
      <div className="mt-2 flex-1 space-y-0.5 overflow-auto px-2">
        {chats.length ? chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => router.push(`/dashboard?c=${chat.id}`)}
            className={`block w-full rounded-md px-3 py-2 text-left ${
              activeChatId === chat.id ? "bg-white shadow-sm" : "hover:bg-white/60"
            }`}
          >
            <span className="block truncate text-sm text-ink">{chat.title}</span>
            <span className="mt-0.5 block font-mono text-[10px] text-muted">Conversation</span>
          </button>
        )) : (
          <p className="px-3 py-2 text-xs leading-relaxed text-muted">
            Your finished conversations will collect here.
          </p>
        )}
      </div>

      <div className="border-t border-rule p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-tint font-medium text-accent">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-muted hover:text-ink">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
