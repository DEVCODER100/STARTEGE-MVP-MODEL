import Link from "next/link";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import { Label } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

interface Row {
  url: string;
  headline: string | null;
}

export default async function LibraryPage() {
  const user = await getOrCreateUser();
  const sql = getDb();

  // Studio creations + every chat-generated image, newest first.
  const rows = (await sql`
    SELECT url, headline, created_at FROM generated_images WHERE user_id = ${user.id}
    UNION ALL
    SELECT m.image_url AS url,
           COALESCE(m.image_meta->'copy'->>'headline', m.image_meta->>'headline') AS headline,
           m.created_at
    FROM chat_messages m
    JOIN chats c ON c.id = m.chat_id
    WHERE c.user_id = ${user.id} AND m.image_url IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 300
  `) as Row[];

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-paper">
      <div className="border-b border-rule bg-paper/85 px-6 py-4">
        <Label>Library</Label>
        <h1 className="mt-1 font-display text-2xl leading-tight text-ink">
          Everything you&apos;ve generated
        </h1>
        <p className="mt-1 text-sm text-muted">
          {rows.length} image{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="p-6">
        {rows.length === 0 ? (
          <div className="mx-auto max-w-md rounded-artifact border border-dashed border-rule bg-white p-10 text-center">
            <p className="text-sm text-muted">
              No images yet. Create your first one in the Image Studio — it&apos;ll show up here.
            </p>
            <Link
              href="/task"
              className="mt-4 inline-block rounded-[9px] bg-strategy px-4 py-2 text-sm font-medium text-white hover:bg-strategy-deep"
            >
              Open Image Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((r, i) => (
              <a
                key={`${r.url}-${i}`}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-xl border border-rule bg-white transition-colors hover:border-strategy"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.url}
                  alt={r.headline || "Generated image"}
                  loading="lazy"
                  className="aspect-square w-full bg-canvas object-cover"
                />
                {r.headline && (
                  <div className="truncate px-3 py-2 text-xs text-ink">{r.headline}</div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
