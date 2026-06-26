"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/primitives";
import {
  PALETTES,
  COLOR_COMBO_IDS,
  STYLES,
  STYLE_IDS,
} from "@/lib/ad-brief";
import { nearestFestival } from "@/lib/festivals";
import type { FrameType } from "@/lib/device-frames";
import type { BrandAsset } from "@/lib/brand-assets-types";

type Frame = FrameType;

function frameOf(f: string | null | undefined): Frame {
  return f === "laptop" || f === "phone" || f === "browser" ? f : "floating";
}
function assetTypeFromFrame(f: Frame): string {
  return f === "laptop"
    ? "web_app_dashboard"
    : f === "phone"
    ? "mobile_app"
    : f === "browser"
    ? "landing_page"
    : "product_photo";
}
const FRAME_OPTS: { id: Frame; label: string }[] = [
  { id: "laptop", label: "Web app / dashboard" },
  { id: "phone", label: "Mobile app" },
  { id: "browser", label: "Landing page" },
  { id: "floating", label: "Just the screenshot" },
];

const PLACEHOLDER =
  "Example: A premium ad for my skincare product in sage green and cream. Product on the left, soft daylight, minimal text. Place my logo bottom-right.";

interface AdDebug {
  prompt: string;
  parsedFields?: unknown;
  mergedFields?: unknown;
  levers?: Record<string, unknown>;
}

interface ResultState {
  url: string;
  copy?: { headline: string; subhead: string; cta: string };
  debug?: AdDebug;
}

export default function ImageStudioPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  // Screenshot ad (SaaS / app / website) + Brand Book asset picker.
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [frameOverride, setFrameOverride] = useState<Frame | "">("");
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadFrame, setUploadFrame] = useState<Frame>("laptop");
  const [saveToBrand, setSaveToBrand] = useState(true);

  useEffect(() => {
    fetch("/api/brand-assets/list")
      .then((r) => r.json())
      .then((d) => Array.isArray(d.assets) && setAssets(d.assets))
      .catch(() => undefined);
  }, []);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null;

  // Debug panel: dev mode, or ?debug=true on the URL (so it never shows for
  // normal users in production).
  const [showDebug, setShowDebug] = useState(process.env.NODE_ENV === "development");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("debug") === "true") {
      setShowDebug(true);
    }
  }, []);

  // Quick-add chips (computed once).
  const chips = useMemo(() => {
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const fest = nearestFestival(14);
    return [
      { id: "colors", label: "+ My brand colors", text: "Use my brand colors from my profile." },
      { id: "logo", label: "+ My logo", text: "Place my logo at bottom-right of the image." },
      { id: "date", label: "+ Today's date", text: `Reference today's date: ${today}.` },
      {
        id: "festival",
        label: "+ Festival theme",
        text: fest
          ? `Reference upcoming festival: ${fest.name}.`
          : "Reference the upcoming festival season.",
      },
    ];
  }, []);

  const has = (s: string) => text.includes(s);
  const toggle = (s: string) =>
    setText((t) =>
      t.includes(s)
        ? t.replace(s, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim()
        : (t.trim() ? t.trim() + " " : "") + s
    );

  const shotInputRef = useRef<HTMLInputElement | null>(null);
  const onPickShot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Screenshot too large (max 10 MB).");
      return;
    }
    setError(null);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setShowUpload(true);
    setSelectedAssetId(""); // a fresh upload takes precedence over a saved pick
    if (shotInputRef.current) shotInputRef.current.value = "";
  };

  // Resolve the chosen screenshot (uploaded-new or saved asset) → URL + frame.
  const resolveScreenshot = async (): Promise<{ screenshotUrl: string; frameType: Frame } | null> => {
    if (showUpload && pendingFile) {
      const form = new FormData();
      form.append("file", pendingFile);
      if (saveToBrand) {
        form.append("asset_type", assetTypeFromFrame(uploadFrame));
        form.append("device_frame_default", uploadFrame);
        const res = await fetch("/api/brand-assets/upload", { method: "POST", body: form });
        const d = await res.json();
        if (!res.ok || !d.asset) throw new Error(d.error || "Could not save the asset.");
        setAssets((a) => [d.asset, ...a]);
        return { screenshotUrl: d.asset.asset_url, frameType: frameOf(d.asset.device_frame_default) };
      }
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error || "Screenshot upload failed.");
      return { screenshotUrl: d.url, frameType: uploadFrame };
    }
    if (selectedAsset) {
      fetch(`/api/brand-assets/${selectedAsset.id}/use`, { method: "POST" }).catch(() => {});
      return {
        screenshotUrl: selectedAsset.asset_url,
        frameType: frameOf(frameOverride || selectedAsset.device_frame_default),
      };
    }
    return null;
  };

  const generate = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      let shot: { screenshotUrl: string; frameType: Frame } | null = null;
      try {
        shot = await resolveScreenshot();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not prepare the screenshot.");
        return;
      }
      const res = await fetch("/api/image/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text, ...(shot ?? {}) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not generate the image.");
        return;
      }
      setResult({ url: data.url, copy: data.copy, debug: data.debug });
    } catch {
      setError("Could not reach the image service.");
    } finally {
      setBusy(false);
    }
  };

  const clearUpload = () => {
    setShowUpload(false);
    setPendingFile(null);
    setPendingPreview(null);
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-paper">
      {/* Top bar */}
      <div className="flex h-[60px] items-center justify-between border-b border-rule px-6">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink">Image studio</span>
        <button
          onClick={() => {
            setText("");
            setResult(null);
            setError(null);
          }}
          className="rounded-[9px] border border-strategy px-4 py-1.5 text-sm font-medium text-strategy-deep hover:bg-strategy-tint/40"
        >
          New
        </button>
      </div>

      <div className="grid lg:grid-cols-[40%_1px_1fr]">
        {/* LEFT — Recommended */}
        <div className="px-6 py-7 sm:px-8">
          <h1 className="font-display text-2xl leading-tight text-ink">Pick a starting point</h1>
          <p className="mt-1 text-sm text-muted">Stratège picks the rest</p>

          <div className="mt-7"><Label>Colors</Label></div>
          <div className="mt-3 grid grid-cols-3 gap-x-5 gap-y-4 sm:grid-cols-3">
            {COLOR_COMBO_IDS.map((id) => {
              const p = PALETTES[id];
              const active = has(p.description_text);
              const stripes = id === "brand" ? [p.colorA, p.colorB, "#171713"] : [p.colorA, p.colorB];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(p.description_text)}
                  className="group text-center"
                >
                  <span
                    className={`flex h-[72px] w-full overflow-hidden rounded-xl border transition-all ${
                      active ? "border-strategy ring-1 ring-strategy" : "border-rule group-hover:border-ink/30"
                    }`}
                  >
                    {stripes.map((c, i) => (
                      <span key={i} style={{ background: c }} className="flex-1" />
                    ))}
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-tight text-ink">{p.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8"><Label>Style</Label></div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STYLE_IDS.map((id) => {
              const s = STYLES[id];
              const active = has(s.description_text);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(s.description_text)}
                  className={`overflow-hidden rounded-xl border bg-white text-left transition-all ${
                    active ? "border-strategy ring-1 ring-strategy" : "border-rule hover:border-ink/30"
                  }`}
                >
                  <span className="block h-[6px] w-full" style={{ background: "linear-gradient(90deg,#1D9E75,#171713)" }} />
                  <span className="block px-4 py-3">
                    <span className="block font-display text-[15px] font-bold text-ink">{s.name}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{s.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DIVIDER */}
        <div className="relative hidden bg-rule lg:block">
          <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-paper text-[9px] font-semibold tracking-wide text-muted">
            OR
          </span>
        </div>

        {/* RIGHT — Describe */}
        <div className="flex flex-col px-6 py-7 sm:px-8">
          <h1 className="font-display text-2xl leading-tight text-ink">Describe what you want</h1>
          <p className="mt-1 text-sm text-muted">
            Pick cards on the left or type here — this text is what Stratège uses.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            className="mt-5 min-h-[220px] flex-1 resize-none rounded-2xl border border-rule bg-white p-5 text-[15px] leading-relaxed text-ink outline-none transition-all placeholder:italic placeholder:text-[#A9A498] focus:border-strategy focus:shadow-focus"
          />

          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Quick add</span>
            {!!text && (
              <button onClick={() => setText("")} className="text-xs text-muted underline underline-offset-2 hover:text-ink">
                Clear all
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((c) => {
              const active = has(c.text);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.text)}
                  className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
                    active
                      ? "border-strategy bg-strategy-tint text-strategy-deep"
                      : "border-rule bg-white text-ink hover:border-strategy hover:text-strategy-deep"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Screenshot ad (SaaS / app / website) — Brand Book asset picker */}
          <div className="mt-5 rounded-xl border border-rule bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Show your product</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">SaaS / app</span>
            </div>

            <input ref={shotInputRef} type="file" accept="image/png,image/jpeg" onChange={onPickShot} className="hidden" />

            {assets.length > 0 && !showUpload && (
              <>
                <p className="mt-1 text-xs text-muted">Pick from your Brand Book — saved once, reusable forever.</p>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink outline-none focus:border-strategy"
                >
                  <option value="">Don&apos;t show a product</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_name}
                    </option>
                  ))}
                </select>

                {selectedAsset && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedAsset.thumbnail_url || selectedAsset.asset_url} alt={selectedAsset.asset_name} className="h-12 w-16 rounded border border-rule object-cover" />
                    <div className="flex-1">
                      <span className="block text-[11px] text-muted">Used {selectedAsset.use_count} time{selectedAsset.use_count === 1 ? "" : "s"}</span>
                      <select
                        value={frameOverride}
                        onChange={(e) => setFrameOverride(e.target.value as Frame)}
                        className="mt-1 w-full rounded-lg border border-rule bg-white px-2 py-1 text-xs text-ink outline-none focus:border-strategy"
                      >
                        <option value="">Frame: default ({selectedAsset.device_frame_default || "floating"})</option>
                        {FRAME_OPTS.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setShowUpload(true); shotInputRef.current?.click(); }}
                  className="mt-3 text-xs text-strategy-deep underline hover:text-strategy"
                >
                  Or upload a new screenshot just for this ad
                </button>
                <Link href="/brand" className="ml-3 text-xs text-muted underline hover:text-ink">Manage assets</Link>
              </>
            )}

            {(assets.length === 0 || showUpload) && (
              <>
                {!pendingPreview ? (
                  <>
                    <p className="mt-1 text-xs text-muted">
                      Upload your first asset to use it across all future ads → it&apos;ll be saved to your Brand Book.
                    </p>
                    <button
                      onClick={() => { setShowUpload(true); shotInputRef.current?.click(); }}
                      className="mt-3 w-full rounded-lg border border-dashed border-rule py-2.5 text-sm text-strategy-deep hover:border-strategy"
                    >
                      Upload a screenshot of your app or website
                    </button>
                  </>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pendingPreview} alt="Screenshot" className="h-14 w-20 rounded border border-rule object-cover" />
                      <button onClick={clearUpload} className="text-xs text-muted underline hover:text-ink">Remove</button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {FRAME_OPTS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setUploadFrame(f.id)}
                          className={`rounded-lg border px-2.5 py-2 text-left text-xs ${
                            uploadFrame === f.id ? "border-strategy bg-strategy-tint text-strategy-deep" : "border-rule text-ink hover:border-strategy"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-ink">
                      <input type="checkbox" checked={saveToBrand} onChange={(e) => setSaveToBrand(e.target.checked)} />
                      💾 Save to Brand Book for reuse
                    </label>
                    {assets.length > 0 && (
                      <button onClick={clearUpload} className="mt-2 text-xs text-muted underline hover:text-ink">
                        ← Use a saved asset instead
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            <p className="mt-2 text-[11px] leading-snug text-muted">
              Tip: use Win+Shift+S (Windows) or Cmd+Shift+4 (Mac) to capture just the part you want — without
              email addresses, notifications, or sensitive info.
            </p>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={generate}
            disabled={!text.trim() || busy}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-strategy text-base font-semibold text-white hover:bg-strategy-deep disabled:opacity-40"
          >
            {busy ? (
              "Generating…"
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Generate image
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-muted">Uses 1 credit · 1 image</p>

          {result && (
            <div className="mt-6 rounded-2xl border border-rule bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="Generated ad" className="w-full rounded-xl" />
              {result.copy && (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-display text-base text-ink">{result.copy.headline}</p>
                  <p className="text-muted">{result.copy.subhead}</p>
                </div>
              )}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-strategy-deep hover:text-strategy"
              >
                Open / download
              </a>

              {showDebug && result.debug && (
                <details className="mt-4 border-t border-rule pt-3">
                  <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink">
                    Debug: show prompt
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                        Ideogram prompt ({result.debug.prompt.length} chars)
                      </div>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-ink/95 p-3 text-[11px] leading-relaxed text-paper">
{result.debug.prompt}
                      </pre>
                    </div>
                    {result.debug.levers && (
                      <DebugBlock title="Levers" value={result.debug.levers} />
                    )}
                    {result.debug.parsedFields != null && (
                      <DebugBlock title="Parsed fields" value={result.debug.parsedFields} />
                    )}
                    {result.debug.mergedFields != null && (
                      <DebugBlock title="Merged fields" value={result.debug.mergedFields} />
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebugBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">{title}</div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-rule bg-canvas p-3 text-[11px] leading-relaxed text-ink">
{JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
