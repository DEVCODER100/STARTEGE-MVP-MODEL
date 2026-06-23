import Link from "next/link";
import { Label, DeskButton, Pill, StatusTag } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/Logo";

const colors = [
  ["Ink", "#171713"], ["Paper", "#F5F1E8"], ["Canvas", "#FBFAF6"],
  ["Strategy", "#087A55"], ["Deep green", "#064B39"], ["Accent", "#E8793B"],
  ["Rule", "#D8D2C5"], ["Muted", "#706D65"],
];

export default function StyleGuidePage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-5 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-base text-ink">Design system</span>
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-ink">Back to site</Link>
      </header>
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <Label>The Strategy Desk</Label>
        <h1 className="mt-2 font-display text-4xl text-ink">Design tokens & components</h1>
        <p className="mt-2 max-w-xl text-muted">Warm paper surfaces, crisp artifacts, and a strategist’s annotation language.</p>

        <section className="mt-10 border-t border-rule py-9">
          <h2 className="mb-5 font-display text-2xl text-ink">Color</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colors.map(([name, hex]) => (
              <div key={name} className="overflow-hidden rounded-card border border-rule bg-white">
                <div className="h-16" style={{ background: hex }} />
                <div className="p-2.5"><p className="text-sm font-medium text-ink">{name}</p><p className="font-mono text-xs text-muted">{hex}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-rule py-9">
          <h2 className="mb-5 font-display text-2xl text-ink">Typography</h2>
          <div className="space-y-3">
            <div className="rounded-card border border-rule bg-white p-5"><Label>Fraunces · display</Label><p className="mt-2 font-display text-4xl">Stories into marketing.</p></div>
            <div className="rounded-card border border-rule bg-white p-5"><Label>Inter · interface</Label><p className="mt-2 text-lg">Clear enough to use every day.</p></div>
            <div className="rounded-card border border-rule bg-white p-5"><Label>JetBrains Mono · metadata</Label><p className="mt-2 font-mono text-sm">PLATFORM · INSTAGRAM · READY</p></div>
          </div>
        </section>

        <section className="border-t border-rule py-9">
          <h2 className="mb-5 font-display text-2xl text-ink">Controls</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-rule bg-white p-5">
            <DeskButton>Primary</DeskButton>
            <DeskButton variant="secondary">Secondary</DeskButton>
            <DeskButton variant="accent">Accent</DeskButton>
            <Pill selected>Selected</Pill>
            <Pill>Unselected</Pill>
            <StatusTag status="Ready to review" />
          </div>
        </section>

        <section className="border-t border-rule py-9">
          <h2 className="mb-5 font-display text-2xl text-ink">Working surfaces</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-rule bg-paper p-5">Paper · page</div>
            <div className="canvas-grid rounded-card border border-rule p-5">Canvas · work</div>
            <div className="rounded-artifact border border-rule bg-white p-5 shadow-artifact">Artifact · output</div>
          </div>
        </section>
      </div>
    </main>
  );
}
