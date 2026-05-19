"use client";

export default function PostedButton({
  platform,
  posted,
  onPosted,
}: {
  platform: string;
  posted?: boolean;
  onPosted: () => void;
}) {
  const link = (() => {
    const p = platform.toLowerCase();
    if (p.includes("instagram")) return "https://www.instagram.com/";
    if (p.includes("facebook")) return "https://www.facebook.com/";
    if (p.includes("youtube")) return "https://www.youtube.com/upload";
    if (p.includes("whatsapp")) return "https://web.whatsapp.com/";
    return null;
  })();

  const handle = () => {
    onPosted();
    if (link) window.open(link, "_blank", "noopener");
  };

  return (
    <button
      onClick={handle}
      disabled={posted}
      className={`w-full py-3 rounded-card font-medium text-sm shadow-card transition-colors ${
        posted
          ? "bg-bg-soft text-text-muted cursor-default"
          : "bg-accent hover:bg-accent-light text-white"
      }`}
    >
      {posted ? "Marked as posted ✓" : `I posted this — open ${platform}`}
    </button>
  );
}
