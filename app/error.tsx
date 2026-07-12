"use client";

// Route-level error boundary. Catches render/data errors in the page tree and
// offers a retry instead of crashing to a blank screen.
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; the message itself is never shown to the user.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <span className="label">Something broke</span>
      <h1 className="mt-3 font-display text-3xl text-ink">That didn’t go through.</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        A hiccup on our end interrupted this. Try again — your work is saved.
      </p>
      <div className="mt-7 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center rounded-[9px] bg-strategy px-5 text-sm font-medium text-white hover:bg-strategy-deep"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-[9px] border border-rule bg-white px-5 text-sm font-medium text-ink hover:border-ink/30"
        >
          Back to the desk
        </a>
      </div>
    </main>
  );
}
