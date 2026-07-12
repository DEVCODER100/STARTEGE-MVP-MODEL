// Route-level loading fallback shown during server-component data fetches and
// navigations. Without this, users saw a blank screen while pages loaded.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 text-muted">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-strategy"
          aria-hidden
        />
        <span className="text-sm">Loading…</span>
        <span className="sr-only">Loading, please wait.</span>
      </div>
    </div>
  );
}
