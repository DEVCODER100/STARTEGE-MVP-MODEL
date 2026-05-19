import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 justify-center"
          >
            <LogoMark size={24} />
            <span className="font-display text-xl text-text-primary">
              Stratège
            </span>
          </Link>
          <h1 className="font-display text-3xl text-text-primary mt-6">
            Welcome back
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Sign in to your marketing co-pilot
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-text-muted text-sm text-center">Loading…</div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-text-muted text-sm mt-6">
          New here?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-light">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
