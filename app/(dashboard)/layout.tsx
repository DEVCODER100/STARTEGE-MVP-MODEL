import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateUser } from "@/lib/users";
import { getDb } from "@/lib/db";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Force onboarding until the brand profile is complete.
  const user = await getOrCreateUser();
  const sql = getDb();
  const rows = await sql`
    SELECT onboarding_complete FROM brand_profiles WHERE user_id = ${user.id} LIMIT 1
  `;
  if (!rows[0]?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
