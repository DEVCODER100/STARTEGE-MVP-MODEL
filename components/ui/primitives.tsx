import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "border border-strategy-deep/20 bg-strategy text-white shadow-sm hover:bg-strategy-deep",
  secondary: "border border-rule bg-white text-ink hover:border-ink/30 hover:bg-canvas",
  ghost: "border border-transparent bg-transparent text-ink hover:bg-ink/[0.05]",
  accent: "border border-black/5 bg-accent text-white hover:brightness-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-[7px] px-3.5 text-sm",
  md: "h-11 rounded-[9px] px-5 text-[0.95rem]",
  lg: "h-12 min-w-11 rounded-[10px] px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
}

export const DeskButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, href, children, ...rest }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-micro ease-desk active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
      variants[variant],
      sizes[size],
      className
    );
    if (href) return <Link href={href} className={classes}>{children}</Link>;
    return <button ref={ref} className={classes} {...rest}>{children}</button>;
  }
);
DeskButton.displayName = "DeskButton";

export function TextLink({
  children,
  href = "#",
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-ink underline decoration-strategy decoration-2 underline-offset-4 transition-colors hover:decoration-accent",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("label", className)}>{children}</span>;
}

export function StatusTag({ status }: { status: string }) {
  const review = /review|ready/i.test(status);
  const posted = /posted|complete/i.test(status);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      posted ? "border-strategy/30 bg-strategy-tint text-strategy-deep" :
      review ? "border-accent/30 bg-accent-tint text-accent" :
      "border-rule bg-paper text-muted"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", posted ? "bg-strategy" : review ? "bg-accent" : "bg-muted")} />
      {status}
    </span>
  );
}

export function Pill({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-all duration-micro",
        selected
          ? "border-strategy bg-strategy-tint font-medium text-strategy-deep ring-1 ring-strategy"
          : "border-rule bg-white text-ink hover:border-ink/30"
      )}
    >
      {selected && <span aria-hidden>✓</span>}
      {children}
    </button>
  );
}
