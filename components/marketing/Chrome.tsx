import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { DeskButton } from "@/components/ui/primitives";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Stratège home">
          <LogoMark size={24} />
          <span className="font-display text-lg text-ink">Stratège</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-ink/80 md:flex">
          <a href="/#how" className="hover:text-ink">How it works</a>
          <a href="/#gallery" className="hover:text-ink">Real output</a>
          <a href="/#memory" className="hover:text-ink">Brand memory</a>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden text-sm text-ink/80 hover:text-ink sm:inline">
            Log in
          </Link>
          <DeskButton href="/signup" size="sm">
            Start free
          </DeskButton>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-rule bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-xs">
            <span className="font-display text-xl">Stratège</span>
            <p className="mt-2 text-sm text-paper/60">
              A personal strategy desk for founders. Business moments in, finished
              marketing out.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-paper/50">Product</p>
              <Link href="/dashboard" className="block text-paper/80 hover:text-paper">The desk</Link>
              <Link href="/brand" className="block text-paper/80 hover:text-paper">Brand book</Link>
              <Link href="/pricing" className="block text-paper/80 hover:text-paper">Pricing</Link>
            </div>
            <div className="space-y-2">
              <p className="text-paper/50">Start</p>
              <Link href="/onboarding" className="block text-paper/80 hover:text-paper">Onboarding</Link>
              <Link href="/signup" className="block text-paper/80 hover:text-paper">Sign up</Link>
              <Link href="/login" className="block text-paper/80 hover:text-paper">Log in</Link>
            </div>
            <div className="space-y-2">
              <p className="text-paper/50">More</p>
              <Link href="/styleguide" className="block text-paper/80 hover:text-paper">Design system</Link>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-paper/15 pt-6 text-xs text-paper/50 sm:flex-row">
          <span>Private beta · Made in India</span>
          <span>© {new Date().getFullYear()} Stratège</span>
        </div>
      </div>
    </footer>
  );
}
