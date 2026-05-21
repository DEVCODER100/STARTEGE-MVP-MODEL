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
    <div className="bg-white border border-border rounded-card p-6 shadow-card">
      {hasGoogle && (
        <>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: next })}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-white text-text-primary text-sm hover:bg-bg-soft transition-colors"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-[11px] uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium shadow-card disabled:opacity-40 transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
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
