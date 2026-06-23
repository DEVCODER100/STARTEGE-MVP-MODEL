import SignupForm from "@/components/auth/SignupForm";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export default function SignupPage() {
  return (
    <main className="auth-shell">
      <section className="auth-form-panel">
        <Link href="/" className="brand-lockup">
          <LogoMark size={24} />
          <span>Stratège</span>
        </Link>
        <div className="auth-form-wrap">
          <p className="eyebrow">Your first working session</p>
          <h1>Create your brand profile.<br /><em>Leave with a ready post.</em></h1>
          <p className="auth-intro">
            Bring your website or Instagram. Stratège will draft what it can,
            ask only what is missing, and make something useful before you finish.
          </p>
          <SignupForm />
          <p className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <aside className="auth-story-panel">
        <p className="eyebrow">What you will leave with</p>
        <div className="auth-artifact">
          <span>Instagram · Founder story</span>
          <h2>“The first order felt impossible. Today we packed the 100th.”</h2>
          <p>
            A reel hook, caption, visual direction, posting time, and the reason
            this angle fits your audience.
          </p>
          <div>
            <small>Using from your brand</small>
            <strong>Voice · Audience · City · Goal</strong>
          </div>
        </div>
        <blockquote>
          “It should feel like directing a strategist, not prompting a machine.”
        </blockquote>
      </aside>
    </main>
  );
}
