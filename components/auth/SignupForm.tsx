"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/ui/Logo";
import { DeskButton, Label } from "@/components/ui/primitives";
import { gallery } from "@/lib/brand";

function BrandLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Stratège home">
      <LogoMark size={28} />
      <span className="font-display text-[1.35rem] leading-none tracking-tight">Stratège</span>
    </Link>
  );
}

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

// Rotating real output + short customer story for the signup split panel.
function RotatingProof() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setI((p) => (p + 1) % gallery.length), 4200);
    return () => window.clearInterval(t);
  }, [reduce]);
  const g = gallery[i];
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
      <div className="canvas-grid absolute inset-0 opacity-[0.06]" />
      <div className="relative">
        <BrandLogo />
      </div>
      <div className="relative">
        <Label>What founders made today</Label>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mt-3"
          >
            <p className="font-display text-2xl italic leading-snug text-paper">{g.input}</p>
            <p className="mt-4 text-sm text-paper/70">{g.choice}</p>
            <div className="mt-4 rounded-card border border-paper/20 bg-paper/[0.06] p-4">
              <p className="text-sm text-paper/90">{g.output}</p>
              <p className="mt-2 text-xs text-accent">{g.outcome}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative flex gap-1.5">
        {gallery.map((_, j) => (
          <span key={j} className={`h-1 rounded-full transition-all ${j === i ? "w-6 bg-accent" : "w-2 bg-paper/30"}`} />
        ))}
      </div>
    </div>
  );
}

export default function SignupForm() {
  const router = useRouter();
  const hasGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create your account.");
        return;
      }
      const r = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (!r || r.error) {
        setError("Account created. Please sign in.");
        router.push("/login");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <RotatingProof />
      <div className="flex items-center justify-center bg-paper px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <BrandLogo />
          </div>
          <Label>Create your account</Label>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
            Leave with your first ready-to-post idea.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Create your brand profile and Stratège will hand you something postable before
            you finish signing up.
          </p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Your name" placeholder="Aarohi Mehta" value={name} onChange={setName} autoComplete="name" />
            <Field label="Work email" type="email" placeholder="you@brand.in" value={email} onChange={setEmail} autoComplete="email" />
            <Field label="Password" type="password" placeholder="At least 8 characters" value={password} onChange={setPassword} autoComplete="new-password" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DeskButton type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Creating your account…" : "Create my brand profile"}
            </DeskButton>
          </form>

          {hasGoogle && (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[9px] border border-rule bg-white text-sm font-medium text-ink hover:border-ink/30"
            >
              <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.3c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.6a5.4 5.4 0 0 1 0-3.4V4.9H.9a9 9 0 0 0 0 8.1l3-2.4z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 4.9l3 2.3C4.6 5.1 6.6 3.6 9 3.6z"/></svg>
              Continue with Google
            </button>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-strategy-deep underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
