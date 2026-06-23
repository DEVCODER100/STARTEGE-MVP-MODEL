"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setBusy(false);
    if (!response || response.error) {
      setError("Wrong email or password.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="rounded-card border border-rule bg-white p-6 shadow-artifact">
      {hasGoogle && (
        <>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: next })}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-rule bg-white py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-canvas"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-rule" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">or</span>
            <div className="h-px flex-1 bg-rule" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Enter your email address" autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[9px] bg-strategy py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-strategy-deep disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        required
        minLength={type === "password" ? 6 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[8px] border border-rule bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-strategy focus:shadow-focus"
        autoComplete={autoComplete}
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
    </svg>
  );
}
