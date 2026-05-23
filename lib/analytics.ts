import posthog from "posthog-js";

/**
 * Capture a custom client-side event in PostHog.
 * No-ops if PostHog isn't initialized (no key configured).
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(posthog as any).__loaded) return;
  posthog.capture(event, props);
}
