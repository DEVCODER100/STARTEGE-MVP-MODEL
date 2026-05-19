import SignupForm from "@/components/auth/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-accent text-xl font-medium tracking-tight"
          >
            Stratège
          </Link>
          <h1 className="text-text-primary text-2xl font-medium mt-6">
            Get your daily marketing task
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Open → Task → Post → Done. Under 5 minutes.
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-text-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-light">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
