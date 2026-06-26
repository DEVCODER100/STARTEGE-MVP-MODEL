"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ["/library", "Library"],
  ["/brand", "Brand book"],
  ["/upgrade", "Plans"],
] as const;

// Top bar + slide-in drawer for screens under `lg`, where the desktop Sidebar is
// hidden. Without this, mobile/tablet users have no nav, profile, or sign-out.
export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const loadChats = useCallback(() => {
    fetch("/api/chats")
      .then((r) => r.json())
      .then((d) => Array.isArray(d.chats) && setChats(d.chats))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadChats();
    window.addEventListener("stratege:chats-changed", loadChats);
    return () => window.removeEventListener("stratege:chats-changed", loadChats);
  }, [loadChats]);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "Founder";
  const initial = name.slice(0, 1).toUpperCase();

  const newChat = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("stratege:new-chat"));
    router.push("/dashboard");
  };

  const openChat = (id: string) => {
    setOpen(false);
    router.push(`/dashboard?c=${id}`);
  };

  return (
    <>
      {/* Top bar (mobile + tablet only) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rule bg-paper px-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-white/60"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-lg text-ink">Stratège</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Profile and menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-tint font-medium text-accent"
        >
          {initial}
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-paper shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-rule px-4">
              <div className="flex items-center gap-2">
                <LogoMark size={22} />
                <span className="font-display text-lg text-ink">Stratège</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/60"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-3 py-3">
              <button
                onClick={newChat}
                className="flex w-full items-center gap-2 rounded-[9px] bg-strategy px-3 py-2.5 text-sm font-medium text-white hover:bg-strategy-deep"
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
                  onClick={() => setOpen(false)}
                  className={`mb-0.5 flex min-h-11 items-center rounded-md px-3 text-sm ${
                    pathname === href
                      ? "bg-white font-medium text-ink shadow-sm"
                      : "text-ink/80 hover:bg-white/60"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 px-4"><Label>Recent work</Label></div>
            <div className="mt-2 flex-1 space-y-0.5 overflow-auto px-2">
              {chats.length ? (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat.id)}
                    className="block w-full rounded-md px-3 py-2 text-left hover:bg-white/60"
                  >
                    <span className="block truncate text-sm text-ink">{chat.title}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs leading-relaxed text-muted">
                  Your finished conversations will collect here.
                </p>
              )}
            </div>

            <div className="border-t border-rule p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-tint font-medium text-accent">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{name}</p>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-xs text-muted hover:text-ink"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
