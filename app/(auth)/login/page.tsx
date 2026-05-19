import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-accent text-xl font-medium tracking-tight"
          >
            Stratège
          </Link>
          <h1 className="text-text-primary text-2xl font-medium mt-6">
            Welcome back
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Sign in to get today&apos;s marketing task
          </p>
        </div>

        <LoginForm />

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
