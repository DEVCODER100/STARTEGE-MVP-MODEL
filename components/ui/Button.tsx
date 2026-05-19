"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export default function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "px-4 py-2 rounded font-medium text-sm transition-colors";
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-light",
    secondary: "bg-bg-surface text-text-primary border-subtle hover:bg-bg-accent-dk",
    ghost: "text-text-secondary hover:text-text-primary",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
