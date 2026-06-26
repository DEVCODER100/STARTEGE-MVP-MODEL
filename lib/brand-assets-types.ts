// Pure types + constants for Brand Book assets — NO database import, so this is
// safe to import from client components (the DB CRUD lives in ./brand-assets).

export type AssetType =
  | "landing_page"
  | "web_app_dashboard"
  | "mobile_app"
  | "product_photo"
  | "logo"
  | "other";

export type FrameDefault = "laptop" | "phone" | "browser" | "floating" | "none";

export const ASSET_TYPES: AssetType[] = [
  "landing_page",
  "web_app_dashboard",
  "mobile_app",
  "product_photo",
  "logo",
  "other",
];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  landing_page: "Landing page",
  web_app_dashboard: "Web app / dashboard",
  mobile_app: "Mobile app",
  product_photo: "Product photo",
  logo: "Logo",
  other: "Other",
};

export interface BrandAsset {
  id: string;
  user_id: string;
  asset_name: string;
  asset_type: AssetType;
  asset_url: string;
  thumbnail_url: string | null;
  device_frame_default: FrameDefault | null;
  width: number | null;
  height: number | null;
  uploaded_at: string;
  last_used_at: string | null;
  use_count: number;
}

export function isAssetType(v: unknown): v is AssetType {
  return typeof v === "string" && (ASSET_TYPES as string[]).includes(v);
}
export function isFrameDefault(v: unknown): v is FrameDefault {
  return v === "laptop" || v === "phone" || v === "browser" || v === "floating" || v === "none";
}

// The device frame that best suits each asset type (used as the default).
export function frameDefaultForType(type: AssetType): FrameDefault {
  switch (type) {
    case "web_app_dashboard":
      return "laptop";
    case "mobile_app":
      return "phone";
    case "landing_page":
      return "browser";
    case "logo":
      return "none";
    default:
      return "floating";
  }
}

// ─── Limits ──────────────────────────────────────────────────────────────────
// Spec tiers, kept for when payments launch.
export function assetLimitForPlan(plan: string): number {
  switch (plan) {
    case "pro":
      return Infinity;
    case "starter":
      return 25;
    default:
      return 3;
  }
}
// During the MVP (payments dormant → everyone is "free") we use one generous cap
// so no one hits a wall they can't pass. Switch to assetLimitForPlan when billing
// goes live.
export const MVP_ASSET_LIMIT = 25;
export function effectiveAssetLimit(_plan: string): number {
  void _plan;
  return MVP_ASSET_LIMIT;
}
