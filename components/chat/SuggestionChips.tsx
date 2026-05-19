"use client";

export default function SuggestionChips({
  chips,
  onPick,
}: {
  chips: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-[560px]">
      {chips.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          className="px-3 py-1.5 rounded-pill bg-white border border-border text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
