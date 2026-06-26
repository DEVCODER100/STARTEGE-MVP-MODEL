"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/primitives";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  frameDefaultForType,
  type AssetType,
  type FrameDefault,
  type BrandAsset,
} from "@/lib/brand-assets-types";

const TYPE_PILL: Record<AssetType, string> = {
  web_app_dashboard: "bg-blue-100 text-blue-700",
  landing_page: "bg-green-100 text-green-700",
  mobile_app: "bg-orange-100 text-orange-700",
  product_photo: "bg-purple-100 text-purple-700",
  logo: "bg-gray-200 text-gray-700",
  other: "bg-gray-200 text-gray-700",
};

const FRAME_LABEL: Record<FrameDefault, string> = {
  laptop: "Inside a laptop",
  phone: "Inside a phone",
  browser: "Inside a browser window",
  floating: "Floating, no frame",
  none: "No frame",
};
const FRAME_OPTIONS: FrameDefault[] = ["laptop", "phone", "browser", "floating", "none"];

export default function AssetsManager() {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [limit, setLimit] = useState<number>(25);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = () =>
    fetch("/api/brand-assets/list")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.assets)) setAssets(d.assets);
        if (typeof d.limit === "number") setLimit(d.limit);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const atLimit = assets.length >= limit;

  const rename = async (a: BrandAsset) => {
    const name = prompt("Rename asset", a.asset_name);
    if (!name || name.trim() === a.asset_name) return;
    const res = await fetch(`/api/brand-assets/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim().slice(0, 80) }),
    });
    if (res.ok) load();
  };

  const changeType = async (a: BrandAsset, type: AssetType) => {
    const res = await fetch(`/api/brand-assets/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, frame: frameDefaultForType(type) }),
    });
    if (res.ok) load();
  };

  const remove = async (a: BrandAsset) => {
    if (!confirm(`Delete "${a.asset_name}"? Past ads already made with it are not affected.`)) return;
    const res = await fetch(`/api/brand-assets/${a.id}`, { method: "DELETE" });
    if (res.ok) setAssets((xs) => xs.filter((x) => x.id !== a.id));
  };

  return (
    <section className="border-t border-rule py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Reusable</Label>
          <h2 className="mt-1 font-display text-2xl text-ink">Product assets</h2>
          <p className="mt-1 text-sm text-muted">Upload screenshots once. Use them in every ad.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{assets.length} / {limit === Infinity ? "∞" : limit}</span>
          <button
            onClick={() => setModal(true)}
            disabled={atLimit}
            className="rounded-[9px] bg-strategy px-3.5 py-2 text-sm font-medium text-white hover:bg-strategy-deep disabled:opacity-40"
            title={atLimit ? "You've reached your asset limit" : undefined}
          >
            + Add asset
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : assets.length === 0 ? (
        <div className="mt-5 rounded-artifact border border-dashed border-rule bg-white p-10 text-center">
          <p className="text-sm text-muted">No assets yet. Upload your first product screenshot.</p>
          <button
            onClick={() => setModal(true)}
            className="mt-4 rounded-[9px] bg-strategy px-4 py-2 text-sm font-medium text-white hover:bg-strategy-deep"
          >
            Upload a screenshot
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => {
            const portrait = (a.height ?? 0) > (a.width ?? 1);
            return (
              <div key={a.id} className="rounded-card border border-rule bg-white p-3">
                <div className="flex justify-center overflow-hidden rounded-xl bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.thumbnail_url || a.asset_url}
                    alt={a.asset_name}
                    className={`rounded-xl object-cover ${portrait ? "h-40 w-[90px]" : "h-[90px] w-40"}`}
                  />
                </div>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <button onClick={() => rename(a)} className="truncate text-left text-sm font-medium text-ink hover:underline" title="Rename">
                    {a.asset_name}
                  </button>
                  <button onClick={() => remove(a)} className="shrink-0 text-muted hover:text-red-600" title="Delete" aria-label="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <select
                    value={a.asset_type}
                    onChange={(e) => changeType(a, e.target.value as AssetType)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium outline-none ${TYPE_PILL[a.asset_type]}`}
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-muted">Used {a.use_count} time{a.use_count === 1 ? "" : "s"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <UploadAssetModal
          onClose={() => setModal(false)}
          onSaved={(a) => {
            setAssets((xs) => [a, ...xs]);
            setModal(false);
          }}
        />
      )}
    </section>
  );
}

function UploadAssetModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (a: BrandAsset) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<AssetType>("web_app_dashboard");
  const [frame, setFrame] = useState<FrameDefault>("laptop");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameTouched = useRef(false);

  const pick = (f: File) => {
    if (f.size > 10 * 1024 * 1024) {
      setError("Image is too large (max 10 MB).");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onType = (t: AssetType) => {
    setType(t);
    if (!frameTouched.current) setFrame(frameDefaultForType(t));
  };

  const save = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("asset_type", type);
      form.append("asset_name", name.trim());
      form.append("device_frame_default", frame);
      const res = await fetch("/api/brand-assets/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.asset) {
        setError(data.error || "Upload failed.");
        return;
      }
      onSaved(data.asset);
    } catch {
      setError("Could not upload.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-auto rounded-artifact border border-rule bg-paper p-5">
        <h3 className="font-display text-xl text-ink">Add a product asset</h3>

        {/* Step 1 — file */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
        />
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 flex h-32 w-full items-center justify-center rounded-card border border-dashed border-rule bg-white text-sm text-strategy-deep hover:border-strategy"
          >
            Click to upload a PNG or JPG (max 10 MB)
          </button>
        ) : (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="max-h-40 w-full rounded-card border border-rule object-contain bg-white" />
            <button onClick={() => fileRef.current?.click()} className="mt-1 text-xs text-muted underline">Choose a different file</button>
          </div>
        )}

        {/* Step 2 — type */}
        <p className="mt-4 text-sm font-medium text-ink">What is this?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ASSET_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onType(t)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                type === t ? "border-strategy bg-strategy-tint text-strategy-deep" : "border-rule text-ink hover:border-strategy"
              }`}
            >
              {ASSET_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Step 3 — name */}
        <p className="mt-4 text-sm font-medium text-ink">Name <span className="text-muted">(optional)</span></p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Stratège dashboard"
          maxLength={80}
          className="mt-2 w-full rounded-card border border-rule bg-white px-3 py-2 text-sm text-ink outline-none focus:border-strategy"
        />

        {/* Step 4 — frame */}
        <p className="mt-4 text-sm font-medium text-ink">How should it appear in ads?</p>
        <select
          value={frame}
          onChange={(e) => { frameTouched.current = true; setFrame(e.target.value as FrameDefault); }}
          className="mt-2 w-full rounded-card border border-rule bg-white px-3 py-2 text-sm text-ink outline-none focus:border-strategy"
        >
          {FRAME_OPTIONS.map((f) => (
            <option key={f} value={f}>{FRAME_LABEL[f]}</option>
          ))}
        </select>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[8px] border border-rule bg-white px-4 py-2 text-sm text-muted">Cancel</button>
          <button
            onClick={save}
            disabled={!file || busy}
            className="rounded-[8px] bg-strategy px-4 py-2 text-sm font-medium text-white hover:bg-strategy-deep disabled:opacity-40"
          >
            {busy ? "Adding…" : "Add to Brand Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
