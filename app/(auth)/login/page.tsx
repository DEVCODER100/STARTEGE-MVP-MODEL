import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-paper text-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
