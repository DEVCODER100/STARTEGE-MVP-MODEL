"use client";

import { useState } from "react";
import { Campaign } from "@/types/campaign";
import CaptionCard from "./CaptionCard";
import ImageCard from "./ImageCard";
import WhatsAppCard from "./WhatsAppCard";
import PostedButton from "./PostedButton";
import FeedbackButtons from "./FeedbackButtons";

export default function TaskOutput({
  campaign,
  banner,
}: {
  campaign: Campaign;
  banner?: React.ReactNode;
}) {
  const [posted, setPosted] = useState(campaign.posted);
  const [feedback, setFeedback] = useState<string | null>(campaign.feedback);

  const sendFeedback = async (
    payload: Partial<{ posted: boolean; feedback: string }>
  ) => {
    try {
      await fetch("/api/campaign/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, ...payload }),
      });
    } catch {}
  };

  const handlePosted = () => {
    setPosted(true);
    sendFeedback({ posted: true });
  };
  const handleFeedback = (v: "orders" | "likes" | "nothing") => {
    setFeedback(v);
    sendFeedback({ feedback: v });
  };

  return (
    <div className="max-w-[720px] mx-auto px-5 py-8 space-y-5">
      {banner}

      <div className="flex flex-wrap gap-2">
        <Tag>{campaign.platform}</Tag>
        <Tag muted>{campaign.best_time}</Tag>
        <Tag muted>{campaign.post_type}</Tag>
      </div>

      <div>
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          {campaign.idea}
        </h1>
        {campaign.hook && (
          <p className="text-text-secondary text-sm mt-3 italic">
            Hook: <span className="not-italic">{campaign.hook}</span>
          </p>
        )}
      </div>

      {campaign.why_this_works && (
        <div className="rounded-card border-l-2 border-accent bg-bg-accent-dk px-4 py-3">
          <div className="text-accent text-[10px] uppercase tracking-wider mb-1">
            Why this works
          </div>
          <p className="text-text-primary text-sm leading-relaxed">
            {campaign.why_this_works}
          </p>
        </div>
      )}

      <CaptionCard caption={campaign.caption} hashtags={campaign.hashtags} />

      <ImageCard
        urls={campaign.image_urls || []}
        recommendedIndex={campaign.recommended_image_index || 0}
      />

      {(campaign.whatsapp_status || campaign.whatsapp_broadcast) && (
        <WhatsAppCard
          status={campaign.whatsapp_status}
          broadcast={campaign.whatsapp_broadcast}
        />
      )}

      <PostedButton
        platform={campaign.platform}
        posted={posted}
        onPosted={handlePosted}
      />

      {posted && (
        <FeedbackButtons current={feedback} onPick={handleFeedback} />
      )}
    </div>
  );
}

function Tag({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`px-2.5 py-1 text-xs rounded-pill ${
        muted ? "bg-bg-soft text-text-secondary" : "bg-bg-accent-dk text-accent"
      }`}
    >
      {children}
    </span>
  );
}
