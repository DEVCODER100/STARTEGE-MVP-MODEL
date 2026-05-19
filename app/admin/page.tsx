import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function fmtDate(d: unknown): string {
  if (!d) return "—";
  const date = new Date(d as string);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ago(d: unknown): string {
  if (!d) return "never";
  const ms = Date.now() - new Date(d as string).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.email)) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-secondary text-sm">Not authorized.</div>
      </main>
    );
  }

  const sql = getDb();

  // Per-tester aggregates
  const users = (await sql`
    SELECT
      u.id, u.email, u.name, u.created_at,
      vp.building_what, vp.audience,
      (SELECT count(*) FROM posts p WHERE p.user_id = u.id) AS post_count,
      (SELECT count(*) FROM events e WHERE e.user_id = u.id AND e.type = 'login') AS login_count,
      (SELECT count(*) FROM events e WHERE e.user_id = u.id AND e.type = 'angle_copied') AS copy_count,
      (SELECT count(*) FROM events e WHERE e.user_id = u.id AND e.type = 'image_generated') AS image_count,
      (SELECT max(e.created_at) FROM events e WHERE e.user_id = u.id) AS last_seen
    FROM users u
    LEFT JOIN voice_profiles vp ON vp.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT 200
  `) as Row[];

  const recentPosts = (await sql`
    SELECT p.id, p.input, p.created_at, u.email
    FROM posts p JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT 40
  `) as Row[];

  const recentEvents = (await sql`
    SELECT e.type, e.metadata, e.created_at, u.email
    FROM events e LEFT JOIN users u ON u.id = e.user_id
    ORDER BY e.created_at DESC
    LIMIT 60
  `) as Row[];

  const totals = (await sql`
    SELECT
      (SELECT count(*) FROM users) AS users,
      (SELECT count(*) FROM posts) AS posts,
      (SELECT count(*) FROM voice_profiles) AS voices,
      (SELECT count(*) FROM events WHERE type = 'image_generated') AS images,
      (SELECT count(*) FROM events WHERE type = 'angle_copied') AS copies
  `) as Row[];
  const t = totals[0] ?? {};

  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl text-text-primary">
            Admin · tester activity
          </h1>
          <a href="/shipped" className="text-accent text-sm hover:underline">
            ← Back to app
          </a>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Stat label="Testers" value={t.users} />
          <Stat label="Voice profiles" value={t.voices} />
          <Stat label="Posts generated" value={t.posts} />
          <Stat label="Images" value={t.images} />
          <Stat label="Copies" value={t.copies} />
        </div>

        {/* Testers */}
        <Section title={`Testers (${users.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs text-left border-b border-border">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Building</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2 pr-3">Last seen</th>
                  <th className="py-2 pr-3">Logins</th>
                  <th className="py-2 pr-3">Posts</th>
                  <th className="py-2 pr-3">Images</th>
                  <th className="py-2 pr-3">Copies</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id as string}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3 text-text-primary">
                      {u.email as string}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary max-w-[220px] truncate">
                      {(u.building_what as string) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {ago(u.last_seen)}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {String(u.login_count)}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {String(u.post_count)}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {String(u.image_count)}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {String(u.copy_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Recent posts */}
        <Section title="What testers are shipping (latest 40)">
          <div className="space-y-2">
            {recentPosts.map((p) => (
              <div
                key={p.id as string}
                className="border border-border rounded-card bg-white p-3"
              >
                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                  <span>{p.email as string}</span>
                  <span>{fmtDate(p.created_at)}</span>
                </div>
                <div className="text-sm text-text-primary whitespace-pre-wrap">
                  {p.input as string}
                </div>
              </div>
            ))}
            {recentPosts.length === 0 && (
              <div className="text-text-muted text-sm">No posts yet.</div>
            )}
          </div>
        </Section>

        {/* Event feed */}
        <Section title="Live event feed (latest 60)">
          <div className="space-y-1">
            {recentEvents.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs border-b border-border last:border-0 py-1.5"
              >
                <span className="text-text-muted w-[88px] shrink-0">
                  {ago(e.created_at)}
                </span>
                <span className="font-medium text-accent w-[140px] shrink-0">
                  {e.type as string}
                </span>
                <span className="text-text-secondary truncate">
                  {(e.email as string) || "—"}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <div className="text-text-muted text-sm">No events yet.</div>
            )}
          </div>
        </Section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-white border border-border rounded-card p-4 shadow-card">
      <div className="text-2xl font-display text-text-primary">
        {String(value ?? 0)}
      </div>
      <div className="text-text-muted text-xs mt-1">{label}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-text-primary font-medium mb-3">{title}</h2>
      {children}
    </section>
  );
}
