"use client";

export default function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all ${
            i < current
              ? "bg-accent w-6"
              : i === current
                ? "bg-accent-light w-8"
                : "bg-border w-3"
          }`}
        />
      ))}
    </div>
  );
}
