import { getDb } from "./db";
import type { AssetType, FrameDefault, BrandAsset } from "./brand-assets-types";

// Server-only DB CRUD for Brand Book assets. Pure types/constants/helpers live
// in ./brand-assets-types (no DB import) and are re-exported here for server code.
export * from "./brand-assets-types";

// ─── CRUD ────────────────────────────────────────────────────────────────────
export async function listAssets(userId: string): Promise<BrandAsset[]> {
  const sql = getDb();
  return (await sql`
    SELECT * FROM brand_assets WHERE user_id = ${userId}
    ORDER BY last_used_at DESC NULLS LAST, uploaded_at DESC
  `) as BrandAsset[];
}

export async function countAssets(userId: string): Promise<number> {
  const sql = getDb();
  const [r] = (await sql`SELECT count(*)::int AS n FROM brand_assets WHERE user_id = ${userId}`) as { n: number }[];
  return r?.n ?? 0;
}

export async function getAsset(userId: string, id: string): Promise<BrandAsset | null> {
  const sql = getDb();
  const [r] = (await sql`SELECT * FROM brand_assets WHERE id = ${id} AND user_id = ${userId} LIMIT 1`) as BrandAsset[];
  return r ?? null;
}

export async function createAsset(input: {
  userId: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnailUrl: string | null;
  frame: FrameDefault;
  width: number | null;
  height: number | null;
}): Promise<BrandAsset> {
  const sql = getDb();
  const [r] = (await sql`
    INSERT INTO brand_assets
      (user_id, asset_name, asset_type, asset_url, thumbnail_url, device_frame_default, width, height)
    VALUES
      (${input.userId}, ${input.name}, ${input.type}, ${input.url}, ${input.thumbnailUrl},
       ${input.frame}, ${input.width}, ${input.height})
    RETURNING *
  `) as BrandAsset[];
  return r;
}

export async function updateAsset(
  userId: string,
  id: string,
  patch: { name?: string; type?: AssetType; frame?: FrameDefault }
): Promise<BrandAsset | null> {
  const sql = getDb();
  const current = await getAsset(userId, id);
  if (!current) return null;
  const name = patch.name ?? current.asset_name;
  const type = patch.type ?? current.asset_type;
  const frame = patch.frame ?? current.device_frame_default;
  const [r] = (await sql`
    UPDATE brand_assets
    SET asset_name = ${name}, asset_type = ${type}, device_frame_default = ${frame}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `) as BrandAsset[];
  return r ?? null;
}

export async function deleteAsset(userId: string, id: string): Promise<BrandAsset | null> {
  const sql = getDb();
  const [r] = (await sql`
    DELETE FROM brand_assets WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `) as BrandAsset[];
  return r ?? null;
}

export async function recordUse(userId: string, id: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE brand_assets
    SET use_count = use_count + 1, last_used_at = now()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
