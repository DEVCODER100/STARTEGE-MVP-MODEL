"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProgressDots from "./ProgressDots";
import QuestionCard, {
  MultiTapGrid,
  PrimaryButton,
  TapGrid,
  TextField,
} from "./QuestionCard";

type Profile = Record<string, unknown> & {
  role?: string;
  industry?: string;
  product?: string;
  target_audience?: string;
  platforms?: string[];
  goal?: string;
  usp?: string;
  posting_time?: string;
  content_style?: string;
  city?: string;
  language?: string;
  whatsapp_enabled?: boolean;
  onboarding_complete?: boolean;
};

const ROLES = [
  { value: "founder", label: "Founder / Owner" },
  { value: "creator", label: "Solo creator" },
  { value: "marketer", label: "In-house marketer" },
  { value: "freelancer", label: "Freelancer / Agency" },
];

const INDUSTRIES = [
  { value: "fashion", label: "Fashion / Apparel" },
  { value: "food", label: "Food & Beverage" },
  { value: "beauty", label: "Beauty / Skincare" },
  { value: "health", label: "Health / Fitness" },
  { value: "education", label: "Education / Coaching" },
  { value: "tech", label: "Tech / SaaS" },
  { value: "services", label: "Services" },
  { value: "retail", label: "Retail / D2C" },
  { value: "real_estate", label: "Real Estate" },
];

const AUDIENCE = [
  "Local customers",
  "Online shoppers",
  "Businesses (B2B)",
  "Students",
  "Working professionals",
  "Homemakers",
];
const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube Shorts" },
  { value: "whatsapp", label: "WhatsApp" },
];
const GOALS = [
  { value: "sales", label: "Sales" },
  { value: "followers", label: "Followers" },
  { value: "engagement", label: "Engagement" },
  { value: "awareness", label: "Awareness" },
];
const TIMES = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];
const STYLES = [
  { value: "educational", label: "Educational" },
  { value: "entertaining", label: "Entertaining" },
  { value: "sales", label: "Sales" },
];
const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai",
  "Kolkata", "Pune", "Surat", "Jaipur", "Lucknow", "Kanpur",
  "Nagpur", "Indore", "Vadodara", "Bhopal", "Coimbatore", "Patna",
  "Ludhiana", "Agra", "Other",
];
const LANGUAGES = [
  "English", "Hindi", "Hinglish", "Marathi", "Gujarati",
  "Tamil", "Telugu", "Bengali", "Kannada", "Malayalam", "Punjabi", "Other",
];

const TOTAL = 11;

type Phase = "kickstart" | "questions";

export default function OnboardingFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("kickstart");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing profile to resume.
  useEffect(() => {
    fetch("/api/brand", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const p: Profile = data.profile || {};
        setProfile(p);
        if (p.onboarding_complete) {
          router.replace("/dashboard");
          return;
        }
        // Skip the URL/kickstart step only if THIS user has already passed it
        // — i.e. a website/product was scraped, or they've answered Q1 (role).
        // DB-based only: never localStorage (it leaks across accounts).
        const kickstartDone = !!p.website || !!p.product || !!p.role;
        if (kickstartDone) {
          setPhase("questions");
          setStep(firstUnansweredStep(p));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const save = async (patch: Partial<Profile>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/brand/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
    } finally {
      setSaving(false);
    }
  };

  const next = async (patch: Partial<Profile>) => {
    await save(patch);
    if (step < TOTAL - 1) setStep(step + 1);
    else {
      await save({ onboarding_complete: true });
      router.push("/dashboard");
    }
  };

  const back = () => step > 0 && setStep(step - 1);

  const finishKickstart = async (patch: Partial<Profile>) => {
    if (Object.keys(patch).length > 0) await save(patch);
    // Re-fetch to get freshly-saved fields, then advance.
    const fresh = await fetch("/api/brand", { cache: "no-store" }).then((r) =>
      r.json()
    );
    const p: Profile = fresh.profile || {};
    setProfile(p);
    setPhase("questions");
    setStep(firstUnansweredStep(p));
  };

  if (loading) {
    return (
      <div className="text-text-muted text-sm">Loading your progress…</div>
    );
  }

  if (phase === "kickstart") {
    return <KickstartStep onDone={finishKickstart} />;
  }

  return (
    <div className="w-full max-w-[480px]">
      <div className="mb-6 flex justify-center">
        <ProgressDots total={TOTAL} current={step} />
      </div>
      <Step
        key={step}
        step={step}
        profile={profile}
        onNext={next}
        onBack={back}
        saving={saving}
      />
    </div>
  );
}

function KickstartStep({
  onDone,
}: {
  onDone: (patch: Partial<Profile>) => void | Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    brand_name: string | null;
    product: string | null;
    website: string;
    brand_colors: string | null;
  } | null>(null);

  const scrape = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error ||
            "That site blocked detailed reading. You can try another URL or skip."
        );
      } else {
        setPreview({
          brand_name: data.data.brand_name,
          product: data.data.product,
          website: data.data.url,
          brand_colors: data.data.brand_colors,
        });
      }
    } catch {
      setError("That site blocked detailed reading. You can try another URL or skip.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    await onDone({
      website: preview.website,
      brand_name: preview.brand_name || undefined,
      product: preview.product || undefined,
      brand_colors: preview.brand_colors || undefined,
    });
  };

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <h2 className="text-text-primary text-xl font-medium mb-2">
        Let&apos;s start with your website
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        Drop your URL and we&apos;ll auto-fill your brand. No website? Skip it.
      </p>

      {!preview ? (
        <div className="bg-bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourbrand.com"
              className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none"
              onKeyDown={(e) => e.key === "Enter" && !busy && scrape()}
            />
            <button
              type="button"
              onClick={scrape}
              disabled={!url.trim() || busy}
              className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Reading…" : "Read site"}
            </button>
          </div>

          {error && (
            <div className="text-sm text-text-secondary border border-border bg-bg-primary rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => onDone({})}
            className="w-full py-2.5 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm hover:border-accent hover:text-text-primary"
          >
            I don&apos;t have a website yet — skip
          </button>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="text-text-muted text-xs">We found:</div>
          <div className="space-y-3">
            <PreviewRow label="Brand" value={preview.brand_name || "—"} />
            <PreviewRow label="Product" value={preview.product || "—"} />
            <PreviewRow label="Website" value={preview.website} />
            {preview.brand_colors && (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-text-secondary">Theme color</span>
                <span className="flex items-center gap-2 text-text-primary">
                  <span
                    className="inline-block w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: preview.brand_colors }}
                  />
                  {preview.brand_colors}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="flex-1 py-2.5 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm hover:border-accent hover:text-text-primary"
            >
              Try another URL
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium"
            >
              Looks good — continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary text-right max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );
}

function firstUnansweredStep(p: Profile): number {
  const order: (keyof Profile | "platforms" | "language_done")[] = [
    "role",
    "industry",
    "product",
    "target_audience",
    "platforms",
    "goal",
    "usp",
    "posting_time",
    "content_style",
    "city",
    "language_done",
  ];
  for (let i = 0; i < order.length; i++) {
    const k = order[i];
    if (k === "platforms") {
      if (!p.platforms || p.platforms.length === 0) return i;
    } else if (k === "language_done") {
      if (!p.language) return i;
    } else if (!p[k as keyof Profile]) return i;
  }
  return 0;
}

function Step({
  step,
  profile,
  onNext,
  onBack,
  saving,
}: {
  step: number;
  profile: Profile;
  onNext: (patch: Partial<Profile>) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const cardProps = {
    step: step + 1,
    total: TOTAL,
    onBack,
    canBack: step > 0,
  };

  switch (step) {
    case 0:
      return <RoleStep {...cardProps} initial={profile.role} onNext={onNext} />;
    case 1:
      return <IndustryStep {...cardProps} initial={profile.industry} onNext={onNext} />;
    case 2:
      return <ProductStep {...cardProps} initial={profile.product} onNext={onNext} saving={saving} />;
    case 3:
      return <AudienceStep {...cardProps} initial={profile.target_audience} onNext={onNext} />;
    case 4:
      return <PlatformsStep {...cardProps} initial={profile.platforms ?? []} onNext={onNext} />;
    case 5:
      return <GoalStep {...cardProps} initial={profile.goal} onNext={onNext} />;
    case 6:
      return <UspStep {...cardProps} initial={profile.usp} onNext={onNext} saving={saving} />;
    case 7:
      return <TimeStep {...cardProps} initial={profile.posting_time} onNext={onNext} />;
    case 8:
      return <StyleStep {...cardProps} initial={profile.content_style} onNext={onNext} />;
    case 9:
      return <CityStep {...cardProps} initial={profile.city} onNext={onNext} />;
    case 10:
      return (
        <LanguageStep
          {...cardProps}
          initialLang={profile.language}
          initialWa={!!profile.whatsapp_enabled}
          onNext={onNext}
        />
      );
    default:
      return null;
  }
}

function RoleStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  return (
    <QuestionCard
      {...c}
      title="What best describes you?"
      hint="Helps us tune the tone of your tasks."
    >
      <TapGrid
        allowOther
        options={ROLES}
        value={initial}
        onPick={(v) => onNext({ role: v })}
      />
    </QuestionCard>
  );
}

function IndustryStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  return (
    <QuestionCard
      {...c}
      title="What industry are you in?"
      hint="So we use the right references and visuals."
    >
      <TapGrid
        allowOther
        options={INDUSTRIES}
        value={initial}
        onPick={(v) => onNext({ industry: v })}
        cols={2}
      />
    </QuestionCard>
  );
}

type StepCommon = {
  step: number;
  total: number;
  onBack: () => void;
  canBack: boolean;
};

function ProductStep({
  initial,
  onNext,
  saving,
  ...c
}: StepCommon & {
  initial?: string;
  onNext: (p: Partial<Profile>) => void;
  saving: boolean;
}) {
  const [v, setV] = useState(initial ?? "");
  return (
    <QuestionCard
      {...c}
      title="Describe your product in one line"
      hint="What do you sell? Keep it crisp — one sentence is plenty."
    >
      <TextField
        value={v}
        onChange={setV}
        placeholder="e.g. Handmade leather wallets for men"
      />
      <PrimaryButton onClick={() => onNext({ product: v.trim() })} disabled={!v.trim() || saving}>
        Continue
      </PrimaryButton>
    </QuestionCard>
  );
}

function AudienceStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  return (
    <QuestionCard
      {...c}
      title="Who is your ideal customer?"
      hint="Pick one — or tap Other to describe yours."
    >
      <TapGrid
        allowOther
        options={AUDIENCE.map((a) => ({ value: a, label: a }))}
        value={initial}
        onPick={(v) => onNext({ target_audience: v })}
      />
    </QuestionCard>
  );
}

function PlatformsStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial: string[]; onNext: (p: Partial<Profile>) => void }) {
  const [vals, setVals] = useState<string[]>(initial);
  const toggle = (v: string) =>
    setVals((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  return (
    <QuestionCard {...c} title="Where do you want to grow?" hint="Pick all that apply.">
      <MultiTapGrid options={PLATFORMS} values={vals} onToggle={toggle} />
      <PrimaryButton onClick={() => onNext({ platforms: vals })} disabled={vals.length === 0}>
        Continue
      </PrimaryButton>
    </QuestionCard>
  );
}

function GoalStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  return (
    <QuestionCard {...c} title="What do you want right now?">
      <TapGrid
        allowOther
        options={GOALS}
        value={initial}
        onPick={(v) => onNext({ goal: v })}
      />
    </QuestionCard>
  );
}

function UspStep({
  initial,
  onNext,
  saving,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void; saving: boolean }) {
  const [v, setV] = useState(initial ?? "");
  return (
    <QuestionCard
      {...c}
      title="Why should someone choose you?"
      hint="One thing that makes you different. Be specific."
    >
      <TextField
        value={v}
        onChange={setV}
        placeholder="e.g. Free 24-hour delivery in Surat with cash on delivery"
      />
      <PrimaryButton onClick={() => onNext({ usp: v.trim() })} disabled={!v.trim() || saving}>
        Continue
      </PrimaryButton>
    </QuestionCard>
  );
}

function TimeStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  return (
    <QuestionCard {...c} title="When can you post daily?">
      <TapGrid
        allowOther
        options={TIMES}
        value={initial}
        onPick={(v) => onNext({ posting_time: v })}
        cols={3}
      />
    </QuestionCard>
  );
}

function StyleStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  return (
    <QuestionCard {...c} title="Pick your content style">
      <TapGrid
        allowOther
        options={STYLES}
        value={initial}
        onPick={(v) => onNext({ content_style: v })}
        cols={3}
      />
    </QuestionCard>
  );
}

function CityStep({
  initial,
  onNext,
  ...c
}: StepCommon & { initial?: string; onNext: (p: Partial<Profile>) => void }) {
  const [v, setV] = useState(initial ?? "");
  return (
    <QuestionCard {...c} title="Your city?" hint="We use this for local context.">
      <select
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="w-full bg-bg-surface border border-border rounded-lg p-3 text-text-primary text-sm focus:border-accent outline-none"
      >
        <option value="">Pick a city</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <PrimaryButton onClick={() => onNext({ city: v })} disabled={!v}>
        Continue
      </PrimaryButton>
    </QuestionCard>
  );
}

function LanguageStep({
  initialLang,
  initialWa,
  onNext,
  ...c
}: StepCommon & {
  initialLang?: string;
  initialWa: boolean;
  onNext: (p: Partial<Profile>) => void;
}) {
  const [lang, setLang] = useState(initialLang ?? "");
  const [wa, setWa] = useState(initialWa);
  const presetLang = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.localStorage.getItem("stratege_signup_language")
        : null,
    []
  );
  useEffect(() => {
    if (!lang && presetLang) {
      // Map signup codes to display names
      const map: Record<string, string> = {
        en: "English", hi: "Hindi", hinglish: "Hinglish", mr: "Marathi",
        gu: "Gujarati", ta: "Tamil", te: "Telugu", bn: "Bengali",
        kn: "Kannada", ml: "Malayalam", pa: "Punjabi",
      };
      setLang(map[presetLang] ?? presetLang);
    }
  }, [lang, presetLang]);

  return (
    <QuestionCard {...c} title="Language & WhatsApp" hint="Languages are always free.">
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary text-xs mb-2">Language</label>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  lang === l
                    ? "bg-bg-accent-dk border-accent text-accent-light"
                    : "bg-bg-surface border-border text-text-secondary hover:border-accent"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-2">
            Enable WhatsApp output?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, label: "Yes, include WhatsApp" },
              { v: false, label: "No, skip it" },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setWa(o.v)}
                className={`px-3 py-3 rounded-lg text-sm border transition-colors ${
                  wa === o.v
                    ? "bg-bg-accent-dk border-accent text-accent-light"
                    : "bg-bg-surface border-border text-text-secondary hover:border-accent"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <PrimaryButton
        onClick={() => onNext({ language: lang, whatsapp_enabled: wa })}
        disabled={!lang}
      >
        Finish setup
      </PrimaryButton>
    </QuestionCard>
  );
}
