"use client";

import { useEffect, useState } from "react";

type Angle = { hook: string; body: string; why: string };
type AnglesObj = { bts: Angle; lesson: Angle; outcome: Angle };
type Post = {
  id: string;
  input: string;
  angle_bts: Angle | null;
  angle_lesson: Angle | null;
  angle_outcome: Angle | null;
  image_url?: string | null;
};
type Usage = {
  posts: { used: number; limit: number; remaining: number };
  images: { used: number; limit: number; remaining: number };
};

const KEYS: ("bts" | "lesson" | "outcome")[] = ["bts", "lesson", "outcome"];
const LABELS: Record<string, string> = {
  bts: "Behind-the-Scenes",
  lesson: "The Lesson",
  outcome: "The Outcome",
};

// Fire-and-forget client event log.
function track(type: "angle_copied" | "image_downloaded", metadata?: Record<string, unknown>) {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, metadata }),
  }).catch(() => {});
}

export default function ShippedPage() {
  const [loadingVoice, setLoadingVoice] = useState(true);
  const [hasVoice, setHasVoice] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);

  const [buildingWhat, setBuildingWhat] = useState("");
  const [audience, setAudience] = useState("");
  const [voiceSamples, setVoiceSamples] = useState("");
  const [platforms, setPlatforms] = useState<("twitter" | "linkedin")[]>([
    "twitter",
  ]);

  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mvpNotice, setMvpNotice] = useState<string | null>(null);
  const [regenKey, setRegenKey] = useState<string | null>(null);

  const [usage, setUsage] = useState<Usage | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/voice")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        if (p?.voice_samples) {
          setHasVoice(true);
          setBuildingWhat(p.building_what || "");
          setAudience(p.audience || "");
          setVoiceSamples(p.voice_samples || "");
          setPlatforms(p.platforms?.length ? p.platforms : ["twitter"]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVoice(false));

    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => d.usage && setUsage(d.usage))
      .catch(() => {});
  }, []);

  const saveVoice = async () => {
    if (!voiceSamples.trim()) return;
    setSavingVoice(true);
    try {
      await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_what: buildingWhat.trim(),
          audience: audience.trim(),
          voice_samples: voiceSamples.trim(),
          voice_source: "paste",
          platforms,
        }),
      });
      setHasVoice(true);
    } finally {
      setSavingVoice(false);
    }
  };

  const togglePlatform = (p: "twitter" | "linkedin") => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const generate = async (only?: "bts" | "lesson" | "outcome") => {
    if (!input.trim()) return;
    if (only) setRegenKey(only);
    else setGenerating(true);
    setError(null);
    setMvpNotice(null);
    try {
      const res = await fetch("/api/post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          only,
          postId: only ? post?.id : undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 429 && data.mvpLimit) {
        setMvpNotice(data.error);
        if (data.usage) setUsage(data.usage);
        return;
      }
      if (!res.ok) throw new Error(data.error || `Server ${res.status}`);

      setFallback(!!data.fallback);
      if (data.usage) setUsage(data.usage);

      if (only && post) {
        setPost((p) =>
          p ? { ...p, [`angle_${only}`]: (data.angles as AnglesObj)[only] } : p
        );
      } else {
        setImgUrl(null);
        setPost({
          id: data.post.id,
          input: data.post.input,
          angle_bts: data.angles.bts,
          angle_lesson: data.angles.lesson,
          angle_outcome: data.angles.outcome,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
      setRegenKey(null);
    }
  };

  const generateImage = async () => {
    if (!post) return;
    setImgBusy(true);
    setError(null);
    setMvpNotice(null);
    try {
      const res = await fetch("/api/post/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, context: post.input }),
      });
      const data = await res.json();
      if (res.status === 429 && data.mvpLimit) {
        setMvpNotice(data.error);
        if (data.usage) setUsage(data.usage);
        return;
      }
      if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
      setImgUrl(data.url);
      if (data.usage) setUsage(data.usage);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate image");
    } finally {
      setImgBusy(false);
    }
  };

  // ───────── Render ─────────
  if (loadingVoice) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!hasVoice) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-5 py-10">
          <h1 className="font-display text-3xl text-text-primary">
            Train your voice
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Paste 2-3 of your recent tweets or LinkedIn posts. We&apos;ll match
            this voice exactly — no AI tone.
          </p>

          <div className="mt-8 space-y-5">
            <Field
              label="What are you building? (one line)"
              value={buildingWhat}
              onChange={setBuildingWhat}
              placeholder="e.g. a content tool for indie hackers"
            />
            <Field
              label="Who is it for? (one line)"
              value={audience}
              onChange={setAudience}
              placeholder="e.g. solo SaaS founders posting on Twitter"
            />

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Your voice — paste 2-3 recent posts
              </label>
              <textarea
                value={voiceSamples}
                onChange={(e) => setVoiceSamples(e.target.value)}
                rows={10}
                placeholder={`Paste your real posts here. Separate each with a blank line.\n\nThe more raw and unedited, the better.`}
                className="w-full bg-white border border-border rounded-card p-3 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none resize-y"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Where do you post?
              </label>
              <div className="flex gap-2">
                {(["twitter", "linkedin"] as const).map((p) => {
                  const on = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-4 py-2 rounded-pill text-sm border transition-colors ${
                        on
                          ? "bg-bg-accent-dk border-accent text-accent"
                          : "bg-white border-border text-text-secondary hover:border-accent"
                      }`}
                    >
                      {p === "twitter" ? "Twitter / X" : "LinkedIn"}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={saveVoice}
              disabled={!voiceSamples.trim() || savingVoice}
              className="w-full py-3 rounded-card bg-accent hover:bg-accent-light text-white font-medium text-sm shadow-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingVoice ? "Saving…" : "Save and start"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const postsLeft = usage?.posts.remaining ?? 0;
  const imagesLeft = usage?.images.remaining ?? 0;
  const postLimitHit = usage ? postsLeft <= 0 : false;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-5 py-8">
        {/* MVP banner */}
        <div className="mb-5 rounded-card border border-border bg-bg-soft px-3 py-2 flex items-center justify-between gap-3">
          <span className="text-text-secondary text-xs">
            MVP testing build · limits reset daily
          </span>
          {usage && (
            <span className="text-text-muted text-xs whitespace-nowrap">
              {usage.posts.used}/{usage.posts.limit} posts ·{" "}
              {usage.images.used}/{usage.images.limit} images
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl text-text-primary">
              What did you ship today?
            </h1>
            <p className="text-text-secondary text-sm mt-2">
              One paragraph is enough. We&apos;ll write 3 angles in your voice.
            </p>
          </div>
          <button
            onClick={() => setHasVoice(false)}
            className="text-xs text-text-muted hover:text-text-primary whitespace-nowrap"
          >
            Edit voice →
          </button>
        </div>

        <div className="bg-white border border-border rounded-card p-4 shadow-card">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="Today I added… / I just figured out… / Shipped a fix for…"
            className="w-full bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-muted resize-y"
            style={{ boxShadow: "none" }}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-text-muted text-[11px]">
              {input.length}/4000
            </span>
            <button
              onClick={() => generate()}
              disabled={!input.trim() || generating || postLimitHit}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating
                ? "Writing…"
                : postLimitHit
                  ? "Daily limit reached"
                  : "Get 3 angles"}
            </button>
          </div>
        </div>

        {mvpNotice && (
          <div className="mt-4 rounded-card border border-accent/30 bg-bg-accent-dk px-4 py-3">
            <div className="text-accent text-xs font-medium mb-1">
              MVP daily limit reached
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              {mvpNotice}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-card border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">
            {error}
          </div>
        )}

        {fallback && post && (
          <div className="mt-4 rounded-card border border-accent/30 bg-bg-accent-dk text-accent text-xs px-3 py-2">
            Demo mode — OpenRouter has no credits yet. Add credit to see real
            voice-matched output.
          </div>
        )}

        {post && (
          <div className="mt-6 space-y-4">
            {KEYS.map((k) => {
              const angle = post[`angle_${k}` as const] as Angle | null;
              if (!angle) return null;
              return (
                <AngleCard
                  key={k}
                  label={LABELS[k]}
                  angleKey={k}
                  angle={angle}
                  regenerating={regenKey === k}
                  onRegen={() => generate(k)}
                />
              );
            })}

            {/* Image */}
            <div className="bg-white border border-border rounded-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-muted text-[10px] uppercase tracking-wider">
                  Post image
                </span>
                <span className="text-text-muted text-[11px]">
                  {imagesLeft} of {usage?.images.limit ?? 5} left today
                </span>
              </div>

              {imgUrl ? (
                <div>
                  <div className="rounded-card overflow-hidden border border-border bg-bg-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt="Generated post image"
                      className="w-full"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        track("image_downloaded", { postId: post?.id })
                      }
                      className="flex-1 text-center px-3 py-2 rounded-lg border border-border text-text-primary text-xs hover:border-accent"
                    >
                      Open full size
                    </a>
                    <button
                      onClick={generateImage}
                      disabled={imgBusy || imagesLeft <= 0}
                      className="flex-1 px-3 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {imgBusy ? "Generating…" : "Generate another"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={generateImage}
                  disabled={imgBusy || imagesLeft <= 0}
                  className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {imgBusy
                    ? "Generating image…"
                    : imagesLeft <= 0
                      ? "Daily image limit reached"
                      : "Generate an image for this post"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-sm mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent outline-none"
      />
    </div>
  );
}

function AngleCard({
  label,
  angleKey,
  angle,
  regenerating,
  onRegen,
}: {
  label: string;
  angleKey: string;
  angle: Angle;
  regenerating: boolean;
  onRegen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${angle.hook}\n\n${angle.body}`);
      setCopied(true);
      track("angle_copied", { angle: angleKey });
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="bg-white border border-border rounded-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-muted text-[10px] uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onRegen}
            disabled={regenerating}
            className="text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            onClick={copy}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium shadow-card transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      <div className="text-text-primary text-sm font-medium leading-snug">
        {angle.hook}
      </div>
      <div className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed mt-2">
        {angle.body}
      </div>

      <div className="mt-4 pt-3 border-t border-border text-text-secondary text-xs italic">
        Why this works: <span className="not-italic">{angle.why}</span>
      </div>
    </div>
  );
}
