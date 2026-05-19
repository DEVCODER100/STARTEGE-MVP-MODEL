import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-5 py-10 flex flex-col items-center">
      <Link
        href="/"
        className="text-accent text-xl font-medium tracking-tight mb-10"
      >
        Stratège
      </Link>
      <OnboardingFlow />
    </main>
  );
}
