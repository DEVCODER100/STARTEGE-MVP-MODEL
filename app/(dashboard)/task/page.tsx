"use client";

import { useEffect, useState } from "react";
import TaskOutput from "@/components/task/TaskOutput";
import ProcessingScreen from "@/components/task/ProcessingScreen";
import { Campaign } from "@/types/campaign";

export default function TaskPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [fallback, setFallback] = useState(false);
  const [imgFallback, setImgFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load most recent campaign on mount
  useEffect(() => {
    fetch("/api/campaign/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.campaigns?.[0]) setCampaign(data.campaigns[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
      setCampaign(data.campaign);
      setFallback(!!data.fallback);
      setImgFallback(!!data.imageFallback);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (generating) return <ProcessingScreen />;

  if (!campaign) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px] text-center">
          <div className="w-12 h-12 mx-auto mb-6 rounded-card bg-bg-accent-dk border border-accent/20 flex items-center justify-center">
            <span className="text-accent text-lg">◐</span>
          </div>
          <h1 className="font-display text-3xl text-text-primary">
            Today&apos;s task
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            One ready-to-post task — caption, image, WhatsApp, all set.
          </p>
          {error && (
            <div className="mt-4 text-red-600 text-sm">{error}</div>
          )}
          <button
            onClick={generate}
            className="mt-8 px-6 py-3 rounded-card bg-accent hover:bg-accent-light text-white font-medium text-sm shadow-card transition-colors"
          >
            Generate today&apos;s task
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <TaskOutput
        campaign={campaign}
        banner={
          <div className="space-y-2">
            {fallback && (
              <div className="rounded-card border border-accent/30 bg-bg-accent-dk text-accent text-xs px-3 py-2">
                Demo task — OpenRouter has no credits yet.
              </div>
            )}
            {imgFallback && (
              <div className="rounded-card border border-border bg-bg-soft text-text-secondary text-xs px-3 py-2">
                Placeholder images — add IDEOGRAM_API_KEY for real ad-ready
                creatives.
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-text-muted text-xs">Today&apos;s task</span>
              <button
                onClick={generate}
                className="text-xs text-accent hover:text-accent-light"
              >
                Generate a new one
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}
