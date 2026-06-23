"use client";

import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/primitives";

export interface BrandProfile {
  brand_name?: string | null;
  product?: string | null;
  target_audience?: string | null;
  platforms?: string[] | null;
  goal?: string | null;
  usp?: string | null;
  content_style?: string | null;
  city?: string | null;
  language?: string | null;
  brand_colors?: string | null;
  website?: string | null;
  industry?: string | null;
}

const editable = [
  ["product", "Product", "What you sell or are building"],
  ["target_audience", "Audience", "Who this work needs to move"],
  ["goal", "Current goal", "The outcome Stratège should optimize for"],
  ["usp", "Positioning", "Why someone should choose you"],
  ["content_style", "Voice", "How the brand should sound"],
  ["city", "Location", "Useful local context"],
  ["language", "Language", "The default writing language"],
] as const;

export default function BrandBook({ initial }: { initial: BrandProfile }) {
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const colors = (profile.brand_colors || "#087A55, #171713, #F5F1E8")
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 5);

  const save = async (key: keyof BrandProfile) => {
    setSaving(true);
    try {
      const response = await fetch("/api/brand/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: draft }),
      });
      const data = await response.json();
      if (data.profile) setProfile(data.profile);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full overflow-auto bg-paper">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-5 backdrop-blur">
        <div>
          <Label>Living memory</Label>
          <span className="ml-3 font-display text-base text-ink">Brand book</span>
        </div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">Back to desk</Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-9 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Label>Brand book</Label>
            <h1 className="mt-1 font-display text-4xl leading-tight text-ink">
              {profile.brand_name || "Your brand"}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              This is the context Stratège carries into every recommendation. Correct it once; the desk remembers.
            </p>
          </div>
          <div className="flex gap-1.5">
            {colors.map((color) => (
              <span key={color} className="h-10 w-10 rounded-md border border-black/10" style={{ background: color }} title={color} />
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-card border border-accent/30 bg-accent-tint/45 p-4">
          <Label>What Stratège knows</Label>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {profile.brand_name || "This brand"} makes {profile.product || "a product"} for {profile.target_audience || "its audience"}.
            The current goal is {profile.goal || "still being defined"}.
          </p>
        </div>

        <div className="mt-7">
          {editable.map(([key, label, hint]) => {
            const value = String(profile[key] || "Not set yet");
            const isEditing = editing === key;
            return (
              <section key={key} className="border-t border-rule py-7">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <Label>{hint}</Label>
                    <h2 className="mt-1 font-display text-2xl text-ink">{label}</h2>
                    {isEditing ? (
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={3}
                        className="mt-3 w-full rounded-card border border-strategy bg-white p-3 text-sm text-ink outline-none shadow-focus"
                      />
                    ) : (
                      <p className="mt-3 leading-relaxed text-ink/85">{value}</p>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)} className="h-9 rounded-[8px] border border-rule bg-white px-3 text-sm text-muted">Cancel</button>
                      <button onClick={() => save(key)} disabled={saving} className="h-9 rounded-[8px] bg-strategy px-4 text-sm font-medium text-white disabled:opacity-50">
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditing(key); setDraft(value === "Not set yet" ? "" : value); }}
                      className="h-9 rounded-full border border-rule bg-white px-3 text-xs text-muted hover:border-strategy hover:text-strategy-deep"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          <section className="border-t border-rule py-7">
            <Label>Where the work goes</Label>
            <h2 className="mt-1 font-display text-2xl text-ink">Platforms</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(profile.platforms || ["Not set yet"]).map((platform) => (
                <span key={platform} className="rounded-full border border-strategy/30 bg-strategy-tint px-3 py-1 text-sm text-strategy-deep">{platform}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
