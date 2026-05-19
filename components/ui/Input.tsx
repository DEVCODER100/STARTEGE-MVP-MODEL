"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-text-secondary">{label}</label>}
      <input className={`px-3 py-2 text-sm ${className}`} {...props} />
    </div>
  );
}
