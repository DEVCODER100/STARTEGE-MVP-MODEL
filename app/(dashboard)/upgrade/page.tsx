import Link from "next/link";
import { Label } from "@/components/ui/primitives";

export default function UpgradePage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-canvas">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Label>Plans</Label>
          <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
            ← Back to desk
          </Link>
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          You&apos;re on the free private-beta plan.
        </h1>
        <p className="mt-3 max-w-md text-muted">
          Everything is included while we&apos;re in private beta — strategy, writing, and
          your image generations. Paid plans aren&apos;t open yet; when they are, you&apos;ll
          see them here first.
        </p>
        <div className="mt-8 rounded-artifact border border-rule bg-white p-6 shadow-artifact">
          <Label>Current plan</Label>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl text-ink">Free</span>
            <span className="text-sm text-muted">private beta</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            No credit card. No limits to worry about while you&apos;re testing.
          </p>
        </div>
      </div>
    </div>
  );
}
