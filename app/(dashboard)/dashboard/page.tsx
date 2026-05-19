import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import DashboardChat from "@/components/dashboard/DashboardChat";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const user = await getOrCreateUser();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
  `;
  const profile = rows[0] || {};

  const hour = new Date().getHours();
  const greetingWord =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName =
    user.name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  const chips = [
    "What should I post today?",
    "Write me a hook for my reel",
    profile.platforms?.includes("whatsapp")
      ? "WhatsApp broadcast for new launch"
      : "Instagram vs WhatsApp strategy",
    "Run ads on ₹500/day",
    "Caption for my product",
    "Festival marketing tips",
  ];

  // Validate `c` looks like a uuid before passing through; ignore otherwise.
  const chatId =
    searchParams?.c && /^[0-9a-f-]{36}$/i.test(searchParams.c)
      ? searchParams.c
      : null;

  return (
    <DashboardChat
      greeting={
        <>
          {greetingWord}, <span className="italic">{firstName}</span>
        </>
      }
      subline="Your AI marketing co-pilot — ask anything, plan a campaign, or create posts."
      chips={chips}
      initialChatId={chatId}
    />
  );
}
