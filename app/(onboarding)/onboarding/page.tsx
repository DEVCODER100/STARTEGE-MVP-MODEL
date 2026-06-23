import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-rule bg-paper/85 px-5 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-base text-ink">Stratège</span>
        </Link>
        <span className="label">Building your brand memory</span>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col items-center px-5 py-8 sm:py-12">
        <OnboardingFlow />
      </div>
    </main>
  );
}
