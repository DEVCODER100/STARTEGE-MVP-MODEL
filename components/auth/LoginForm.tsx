"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { DeskButton } from "@/components/ui/primitives";

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="h-12 w-full rounded-card border border-rule bg-white px-4 outline-none transition-all focus:border-strategy focus:shadow-focus"
      />
    </label>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  // Only accept same-origin relative paths — never "//evil.com" or absolute
  // URLs — so `next` can't be used as an open redirect.
  const rawNext = search.get("next") || "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const hasGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setBusy(false);
    if (!res || res.error) {
      setError("Wrong email or password.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2.5" aria-label="Stratège home">
          <LogoMark size={28} />
          <span className="font-display text-[1.35rem] leading-none tracking-tight text-ink">
            Stratège
          </span>
        </Link>
        <h1 className="mt-8 text-center font-display text-3xl leading-tight text-ink">
          Welcome back.
        </h1>
        <p className="mt-1 text-center text-sm text-muted">Your desk is where you left it.</p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <Field label="Email" type="email" placeholder="you@brand.in" value={email} onChange={setEmail} autoComplete="email" />
          <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} autoComplete="current-password" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DeskButton type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </DeskButton>
        </form>

        {hasGoogle && (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: next })}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[9px] border border-rule bg-white text-sm font-medium text-ink hover:border-ink/30"
          >
            <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.3c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.6a5.4 5.4 0 0 1 0-3.4V4.9H.9a9 9 0 0 0 0 8.1l3-2.4z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 4.9l3 2.3C4.6 5.1 6.6 3.6 9 3.6z"/></svg>
            Continue with Google
          </button>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-strategy-deep underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
