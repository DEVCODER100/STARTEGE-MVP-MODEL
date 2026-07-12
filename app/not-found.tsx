import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <span className="label">Error · 404</span>
      <h1 className="mt-3 font-display text-4xl text-ink">This page isn’t on the desk.</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        The link may be old or the page may have moved. Head back to your strategy desk.
      </p>
      <Link
        href="/dashboard"
        className="mt-7 inline-flex h-11 items-center rounded-[9px] bg-strategy px-5 text-sm font-medium text-white hover:bg-strategy-deep"
      >
        Back to the desk
      </Link>
    </main>
  );
}
