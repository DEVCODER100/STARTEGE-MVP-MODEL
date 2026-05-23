"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY || typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((posthog as any).__loaded) return;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // we capture manually (App Router)
      capture_pageleave: true,
      person_profiles: "identified_only", // only build profiles for logged-in users
    });
  }, []);

  // No key configured → render children untouched (analytics simply off).
  if (!KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <IdentifyUser />
      {children}
    </PHProvider>
  );
}

/** Capture a $pageview on every route change. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

/** Tie events to the real signed-in user (id + email + name). */
function IdentifyUser() {
  const { data: session, status } = useSession();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    if (status === "authenticated" && session?.user) {
      const id = session.user.id ?? session.user.email ?? undefined;
      if (id) {
        ph.identify(id, {
          email: session.user.email ?? undefined,
          name: session.user.name ?? undefined,
        });
      }
    } else if (status === "unauthenticated") {
      ph.reset();
    }
  }, [status, session, ph]);

  return null;
}
