import Link from "next/link";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";

export default async function BrandPage() {
  const user = await getOrCreateUser();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
  `;
  const p = rows[0] || {};

  const fields: { label: string; value: string }[] = [
    { label: "Role", value: p.role || "—" },
    { label: "Industry", value: p.industry || "—" },
    { label: "Product", value: p.product || "—" },
    { label: "Target audience", value: p.target_audience || "—" },
    { label: "Platforms", value: (p.platforms || []).join(", ") || "—" },
    { label: "Goal", value: p.goal || "—" },
    { label: "USP", value: p.usp || "—" },
    { label: "Posting time", value: p.posting_time || "—" },
    { label: "Content style", value: p.content_style || "—" },
    { label: "City", value: p.city || "—" },
    { label: "Language", value: p.language || "—" },
    {
      label: "WhatsApp output",
      value: p.whatsapp_enabled ? "Enabled" : "Disabled",
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-text-primary text-2xl font-medium mb-1">
        Brand profile
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        Used to personalize every task.
      </p>

      <div className="bg-bg-surface border border-border rounded-xl divide-y divide-border">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex items-start justify-between gap-4 px-5 py-4"
          >
            <div className="text-text-secondary text-sm">{f.label}</div>
            <div className="text-text-primary text-sm text-right max-w-[60%]">
              {f.value}
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/onboarding"
        className="inline-block mt-6 text-accent text-sm hover:text-accent-light"
      >
        Re-run onboarding →
      </Link>
    </div>
  );
}
