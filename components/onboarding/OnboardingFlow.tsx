"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DeskButton, Label, Pill } from "@/components/ui/primitives";

type Profile = {
  brand_name?: string;
  website?: string;
  product?: string;
  industry?: string;
  target_audience?: string;
  goal?: string;
  usp?: string;
  platforms?: string[];
  content_style?: string;
  brand_colors?: string;
  onboarding_complete?: boolean;
};

const chapters = ["Import", "Review", "Business", "Audience", "Voice & visual", "First post"];
const goals = ["Get more sales", "Build awareness", "Launch something", "Grow an audience"];
const audiences = ["Local customers", "Online shoppers", "Founders", "Small businesses", "Working professionals", "Creators"];
const platforms = ["Instagram", "LinkedIn", "Twitter / X", "Facebook", "WhatsApp", "YouTube"];
const tones = ["Warm", "Clear", "Bold", "Playful", "Expert", "Candid", "Premium", "Minimal"];

export default function OnboardingFlow() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({});
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/brand", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const current = data.profile || {};
        if (current.onboarding_complete) {
          router.replace("/dashboard");
          return;
        }
        setProfile(current);
        setUrl(current.website || "");
        setSelectedTones(current.content_style ? current.content_style.split(",").map((item: string) => item.trim()) : []);
        if (current.website || current.product) setStep(1);
      })
      .finally(() => setBusy(false));
  }, [router]);

  const save = async (patch: Partial<Profile>) => {
    const response = await fetch("/api/brand/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save");
    setProfile(data.profile || { ...profile, ...patch });
  };

  const importBrand = async () => {
    if (!url.trim()) {
      setStep(2);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "We could not read that website.");
      const found = data.data || {};
      await save({
        website: found.url || url.trim(),
        brand_name: found.brand_name || profile.brand_name,
        product: found.product || profile.product,
        brand_colors: found.brand_colors || profile.brand_colors,
      });
      setStep(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not read that website.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    await save({ onboarding_complete: true });
    router.push("/dashboard");
    router.refresh();
  };

  if (busy && step === 0) return <div className="py-24 text-sm text-muted">Reading your saved progress…</div>;

  return (
    <div className="w-full">
      <Progress step={step} />
      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9"
        >
          {step === 0 && (
            <>
              <Label>Start from what already exists</Label>
              <h1 className="mt-1 font-display text-4xl leading-tight text-ink">Bring your website. We’ll draft the brand memory.</h1>
              <p className="mt-3 text-muted">You will correct what we find—not fill twelve empty boxes.</p>
              <label className="mt-7 block">
                <span className="text-sm font-medium text-ink">Website URL</span>
                <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://yourbrand.com" className="mt-2 h-12 w-full rounded-card border border-rule bg-white px-4 text-ink outline-none focus:border-strategy focus:shadow-focus" />
              </label>
              {error && <p className="mt-3 rounded-card border border-accent/30 bg-accent-tint p-3 text-sm text-accent">{error}</p>}
              <DeskButton onClick={importBrand} disabled={busy} size="lg" className="mt-6 w-full">{busy ? "Reading your brand…" : "Read my brand"}</DeskButton>
              <button onClick={() => setStep(2)} className="mt-4 w-full text-sm text-muted underline underline-offset-4 hover:text-ink">I don’t have a website yet</button>
            </>
          )}

          {step === 1 && (
            <>
              <Label>Here’s what we found</Label>
              <h1 className="mt-1 font-display text-4xl leading-tight text-ink">Your brand, on one screen.</h1>
              <p className="mt-3 text-muted">Fix anything that is off. We’ll only ask about what is missing.</p>
              <div className="mt-7 overflow-hidden rounded-card border border-rule bg-rule">
                {[
                  ["Brand", profile.brand_name || "Not found"],
                  ["Product", profile.product || "Not found"],
                  ["Website", profile.website || "Not provided"],
                  ["Colors", profile.brand_colors || "We’ll choose these together"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-5 bg-white p-4">
                    <Label>{label}</Label><span className="max-w-[65%] text-right text-sm text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3"><DeskButton variant="ghost" onClick={() => setStep(0)}>Back</DeskButton><DeskButton className="flex-1" onClick={() => setStep(2)}>Looks right — continue</DeskButton></div>
            </>
          )}

          {step === 2 && (
            <>
              <Label>Chapter · Business</Label>
              <h1 className="mt-1 font-display text-4xl leading-tight text-ink">What are you building, and what matters now?</h1>
              <div className="mt-7 space-y-4">
                <Field label="Product or service" value={profile.product || ""} onChange={(product) => setProfile({ ...profile, product })} placeholder="One clear sentence" />
                <Field label="Why should someone choose you?" value={profile.usp || ""} onChange={(usp) => setProfile({ ...profile, usp })} placeholder="The strongest difference" />
                <div><Label>Current goal</Label><div className="mt-2 flex flex-wrap gap-2">{goals.map((goal) => <Pill key={goal} selected={profile.goal === goal} onClick={() => setProfile({ ...profile, goal })}>{goal}</Pill>)}</div></div>
              </div>
              <Nav back={() => setStep(profile.website ? 1 : 0)} next={async () => { await save({ product: profile.product, usp: profile.usp, goal: profile.goal }); setStep(3); }} />
            </>
          )}

          {step === 3 && (
            <>
              <Label>Chapter · Audience</Label>
              <h1 className="mt-1 font-display text-4xl leading-tight text-ink">Who are you talking to, and where?</h1>
              <div className="mt-7">
                <Field label="Describe the ideal customer" value={profile.target_audience || ""} onChange={(target_audience) => setProfile({ ...profile, target_audience })} placeholder="Who they are, what they want, what gets in the way" />
                <Label>Quick audience signals</Label>
                <div className="mt-2 flex flex-wrap gap-2">{audiences.map((audience) => <Pill key={audience} onClick={() => setProfile({ ...profile, target_audience: audience })} selected={profile.target_audience === audience}>{audience}</Pill>)}</div>
                <div className="mt-6"><Label>Publishing platforms</Label><div className="mt-2 flex flex-wrap gap-2">{platforms.map((platform) => <Pill key={platform} selected={(profile.platforms || []).includes(platform.toLowerCase())} onClick={() => {
                  const value = platform.toLowerCase();
                  const current = profile.platforms || [];
                  setProfile({ ...profile, platforms: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
                }}>{platform}</Pill>)}</div></div>
              </div>
              <Nav back={() => setStep(2)} next={async () => { await save({ target_audience: profile.target_audience, platforms: profile.platforms }); setStep(4); }} />
            </>
          )}

          {step === 4 && (
            <>
              <Label>Chapter · Voice & visual identity</Label>
              <h1 className="mt-1 font-display text-4xl leading-tight text-ink">How should the brand feel?</h1>
              <p className="mt-3 text-muted">Choose a few traits. The image studio and writing system will carry them forward.</p>
              <div className="mt-7 flex flex-wrap gap-2">{tones.map((tone) => <Pill key={tone} selected={selectedTones.includes(tone)} onClick={() => setSelectedTones(selectedTones.includes(tone) ? selectedTones.filter((item) => item !== tone) : [...selectedTones, tone])}>{tone}</Pill>)}</div>
              <div className="mt-7"><Field label="Brand colors" value={profile.brand_colors || ""} onChange={(brand_colors) => setProfile({ ...profile, brand_colors })} placeholder="#087A55, #F5F1E8, #171713" /></div>
              <Nav back={() => setStep(3)} next={async () => { await save({ content_style: selectedTones.join(", "), brand_colors: profile.brand_colors }); setStep(5); }} label="Create my first brief" />
            </>
          )}

          {step === 5 && (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-strategy-tint text-strategy-deep">✓</span>
              <h1 className="mt-4 font-display text-4xl leading-tight text-ink">Your strategy desk is ready.</h1>
              <p className="mx-auto mt-3 max-w-lg text-muted">Your first conversation will already know the product, audience, goal, voice, and visual identity.</p>
              <div className="mt-7 rounded-artifact border border-rule bg-white text-left shadow-artifact">
                <div className="border-b border-rule bg-paper/45 px-4 py-3"><Label>First opportunity · ready to explore</Label></div>
                <div className="p-5"><Label>Recommended starting point</Label><p className="mt-2 font-display text-xl text-ink">Tell Stratège one thing that happened in the business this week.</p><p className="mt-2 text-sm text-muted">The desk will turn it into the best-fit post, campaign, or visual direction.</p></div>
              </div>
              <DeskButton onClick={finish} disabled={busy} size="lg" className="mt-7 w-full">{busy ? "Opening your desk…" : "Open my strategy desk"}</DeskButton>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {chapters.map((chapter, index) => (
        <div key={chapter} className="flex shrink-0 items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${index < step ? "bg-strategy text-white" : index === step ? "border border-strategy bg-strategy-tint text-strategy-deep" : "border border-rule bg-white text-muted"}`}>{index < step ? "✓" : index + 1}</span>
          <span className={`hidden text-xs sm:block ${index === step ? "font-medium text-ink" : "text-muted"}`}>{chapter}</span>
          {index < chapters.length - 1 && <span className={`h-px w-4 ${index < step ? "bg-strategy" : "bg-rule"}`} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><Label>{label}</Label><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={2} className="mt-2 w-full rounded-card border border-rule bg-white p-4 text-sm text-ink outline-none placeholder:text-muted focus:border-strategy focus:shadow-focus" /></label>;
}

function Nav({ back, next, label = "Continue" }: { back: () => void; next: () => void | Promise<void>; label?: string }) {
  return <div className="mt-7 flex gap-3"><DeskButton variant="ghost" onClick={back}>Back</DeskButton><DeskButton className="flex-1" onClick={next}>{label}</DeskButton></div>;
}
