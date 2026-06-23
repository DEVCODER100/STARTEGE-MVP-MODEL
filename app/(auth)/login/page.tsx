import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <main className="auth-shell auth-shell--login">
      <section className="auth-form-panel">
        <Link href="/" className="brand-lockup">
          <LogoMark size={24} />
          <span>Stratège</span>
        </Link>
        <div className="auth-form-wrap">
          <p className="eyebrow">Back to the desk</p>
          <h1>Continue where<br /><em>the work left off.</em></h1>
          <p className="auth-intro">
            Your brand context, drafts, campaigns, and recent decisions are waiting.
          </p>
          <Suspense fallback={<div className="auth-loading">Loading…</div>}>
            <LoginForm />
          </Suspense>
          <p className="auth-switch">
            New here? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </section>

      <aside className="auth-story-panel auth-story-panel--quiet">
        <p className="eyebrow">On your desk</p>
        <div className="desk-list">
          <div><span>01</span><p><small>Draft</small>Order #100 founder reel</p></div>
          <div><span>02</span><p><small>Campaign</small>Summer launch · 7 days</p></div>
          <div><span>03</span><p><small>Brand learning</small>Approve a new voice trait</p></div>
        </div>
        <p className="auth-margin-note">Everything autosaved. Nothing lost in the conversation.</p>
      </aside>
    </main>
  );
}
