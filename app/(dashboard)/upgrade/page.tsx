import Link from "next/link";
import { PricingPlans } from "@/components/marketing/PricingPlans";
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
          Upgrade when posting becomes a habit.
        </h1>
        <p className="mt-2 max-w-md text-muted">
          Strategy and writing are always included. You only pay for more image
          generations and higher limits. You&apos;re on the free private-beta plan today.
        </p>
        <div className="mt-8">
          <PricingPlans inApp />
        </div>
      </div>
    </div>
  );
}
