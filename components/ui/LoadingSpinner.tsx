export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-text-muted border-t-accent"
      style={{ width: size, height: size }}
    />
  );
}
