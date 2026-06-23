"use client";

import { ReactNode, useState } from "react";

export default function QuestionCard({
  step,
  total,
  title,
  hint,
  children,
  onBack,
  canBack,
}: {
  step: number;
  total: number;
  title: string;
  hint?: string;
  children: ReactNode;
  onBack?: () => void;
  canBack?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="mb-7 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted">
        <span>
          Step {step} of {total}
        </span>
        {canBack && onBack && (
          <button
            onClick={onBack}
            className="text-muted hover:text-ink"
          >
            ← Back
          </button>
        )}
      </div>
      <h2 className="font-display text-3xl leading-tight text-ink">{title}</h2>
      {hint && <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function TapGrid({
  options,
  value,
  onPick,
  cols = 2,
  allowOther = false,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onPick: (v: string) => void;
  cols?: 2 | 3;
  allowOther?: boolean;
}) {
  // "Other" is active if the current value isn't in the preset list.
  const presetValues = options.map((o) => o.value);
  const isOther =
    allowOther && !!value && !presetValues.includes(value);
  const [showOther, setShowOther] = useState(isOther);
  const [otherText, setOtherText] = useState(isOther ? value! : "");

  return (
    <div className="space-y-3">
      <div className={`grid ${cols === 3 ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              setShowOther(false);
              onPick(o.value);
            }}
            className={`px-3 py-3 rounded-lg text-sm border transition-colors ${
              value === o.value && !showOther
                ? "border-strategy bg-strategy-tint font-medium text-strategy-deep ring-1 ring-strategy"
                : "border-rule bg-white text-ink hover:border-strategy"
            }`}
          >
            {o.label}
          </button>
        ))}
        {allowOther && (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className={`px-3 py-3 rounded-lg text-sm border transition-colors ${
              showOther || isOther
                ? "border-strategy bg-strategy-tint font-medium text-strategy-deep ring-1 ring-strategy"
                : "border-rule bg-white text-ink hover:border-strategy"
            }`}
          >
            + Other
          </button>
        )}
      </div>
      {allowOther && showOther && (
        <div className="flex gap-2">
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Type your answer…"
            className="flex-1 rounded-card border border-rule bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-strategy focus:shadow-focus"
            onKeyDown={(e) => {
              if (e.key === "Enter" && otherText.trim()) {
                onPick(otherText.trim());
              }
            }}
          />
          <button
            type="button"
            disabled={!otherText.trim()}
            onClick={() => onPick(otherText.trim())}
            className="rounded-[8px] bg-strategy px-4 py-2.5 text-sm font-medium text-white hover:bg-strategy-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export function MultiTapGrid({
  options,
  values,
  onToggle,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`px-3 py-3 rounded-lg text-sm border transition-colors ${
              on
                ? "border-strategy bg-strategy-tint font-medium text-strategy-deep ring-1 ring-strategy"
                : "border-rule bg-white text-ink hover:border-strategy"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full resize-none rounded-card border border-rule bg-white p-4 text-sm text-ink outline-none placeholder:text-muted focus:border-strategy focus:shadow-focus"
    />
  );
}

export function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 w-full rounded-[9px] bg-strategy py-3 text-sm font-medium text-white transition-colors hover:bg-strategy-deep disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
