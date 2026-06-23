import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import BrandBook, { type BrandProfile } from "@/components/brand/BrandBook";

export default async function BrandPage() {
  const user = await getOrCreateUser();
  const sql = getDb();
  const rows = await sql`SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1`;
  const row = rows[0] || {};
  const profile: BrandProfile = {
    brand_name: row.brand_name,
    product: row.product,
    target_audience: row.target_audience,
    platforms: row.platforms,
    goal: row.goal,
    usp: row.usp,
    content_style: row.content_style,
    city: row.city,
    language: row.language,
    brand_colors: row.brand_colors,
    website: row.website,
    industry: row.industry,
  };
  return <BrandBook initial={profile} />;
}
