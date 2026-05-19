"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogoMark } from "@/components/ui/Logo";

interface ChatSummary {
  id: string;
  title: string;
  updated_at: string;
}

const NAV = [
  {
    href: "/dashboard",
    label: "AI coach",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/brand",
    label: "Brand profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: "/upgrade",
    label: "Upgrade",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 12V22H4V12" />
        <path d="M22 7H2v5h20V7z" />
        <path d="M12 22V7" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get("c");
  const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const email = session?.user?.email ?? "";
  const name = session?.user?.name || email.split("@")[0] || "You";
  const initial = (name[0] || "S").toUpperCase();

  const loadChats = useCallback(() => {
    fetch("/api/chats")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.chats)) setChats(data.chats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadChats();
    const handler = () => loadChats();
    window.addEventListener("stratege:chats-changed", handler);
    return () => window.removeEventListener("stratege:chats-changed", handler);
  }, [loadChats]);

  const newChat = () => {
    window.dispatchEvent(new CustomEvent("stratege:new-chat"));
    if (pathname !== "/dashboard" || activeChatId) router.push("/dashboard");
  };

  const openChat = (id: string) => router.push(`/dashboard?c=${id}`);

  const deleteChat = async (id: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setChats((cs) => cs.filter((c) => c.id !== id));
    if (activeChatId === id) router.push("/dashboard");
  };

  return (
    <aside className="w-[230px] bg-bg-sidebar border-r border-border hidden md:flex md:flex-col">
      <div className="px-4 py-4 border-b border-border flex items-center gap-2">
        <LogoMark size={24} />
        <span className="font-display text-lg text-text-primary">Stratège</span>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={newChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New chat
        </button>
      </div>

      <div className="px-2 pt-3 pb-1">
        <p className="text-[10px] text-text-muted uppercase tracking-wider px-3 mb-1.5">
          Menu
        </p>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                active
                  ? "bg-bg-accent-dk text-accent"
                  : "text-text-secondary hover:bg-bg-soft hover:text-text-primary"
              }`}
            >
              <span className="w-4 h-4">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="h-px bg-border mx-3 my-3" />

      <div className="px-2 flex-1 overflow-hidden flex flex-col">
        <p className="text-[10px] text-text-muted uppercase tracking-wider px-3 mb-1.5">
          Recent chats
        </p>
        <div className="overflow-y-auto pr-1 space-y-0.5 flex-1">
          {chats.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-text-muted leading-relaxed">
              No chats yet. Ask Stratège something to start.
            </div>
          ) : (
            chats.map((c) => {
              const active = activeChatId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group relative rounded-md ${
                    active ? "bg-bg-accent-dk" : "hover:bg-bg-soft"
                  }`}
                >
                  <button
                    onClick={() => openChat(c.id)}
                    className={`block w-full text-left px-3 py-1.5 rounded-md text-xs truncate ${
                      active
                        ? "text-accent"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                    title={c.title}
                  >
                    {c.title}
                  </button>
                  <button
                    onClick={(e) => deleteChat(c.id, e)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-600 px-1 transition-opacity"
                    title="Delete chat"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-border p-3 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-bg-accent-dk text-accent flex items-center justify-center text-xs font-medium flex-shrink-0">
          {initial}
        </span>
        <div className="leading-tight min-w-0 flex-1">
          <div className="text-xs text-text-primary font-medium truncate">
            {name}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-[10px] text-text-muted hover:text-text-primary"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
