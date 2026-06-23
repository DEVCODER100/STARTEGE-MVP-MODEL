"use client";

export default function SuggestionChips({
  chips,
  onPick,
}: {
  chips: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex max-w-[560px] flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          className="rounded-full border border-rule bg-white px-3 py-1.5 text-xs text-ink transition-colors hover:border-strategy hover:text-strategy-deep"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
