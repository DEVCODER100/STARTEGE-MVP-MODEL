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
    <div className="w-full max-w-[480px] mx-auto">
      <div className="mb-6 flex items-center justify-between text-xs text-text-muted">
        <span>
          Step {step} of {total}
        </span>
        {canBack && onBack && (
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-text-primary"
          >
            ← Back
          </button>
        )}
      </div>
      <h2 className="text-text-primary text-xl font-medium mb-2">{title}</h2>
      {hint && <p className="text-text-secondary text-sm mb-6">{hint}</p>}
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
                ? "bg-bg-accent-dk border-accent text-accent-light"
                : "bg-bg-surface border-border text-text-secondary hover:border-accent"
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
                ? "bg-bg-accent-dk border-accent text-accent-light"
                : "bg-bg-surface border-border text-text-secondary hover:border-accent"
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
            className="flex-1 bg-bg-surface border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none"
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
            className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
                ? "bg-bg-accent-dk border-accent text-accent-light"
                : "bg-bg-surface border-border text-text-secondary hover:border-accent"
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
      className="w-full bg-bg-surface border border-border rounded-lg p-3 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none resize-none"
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
      className="w-full mt-6 py-3 rounded-lg bg-accent hover:bg-accent-light text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
