// NextAuth v5 config — JWT sessions, credentials + optional Google.
// Users live in our `users` table. OAuth links in `auth_accounts`.

import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { logEvent } from "@/lib/events";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const Creds = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = Creds.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const sql = getDb();
      const rows = await sql`
        SELECT id, email, name, image, password_hash
        FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
      `;
      const user = rows[0];
      if (!user || !user.password_hash) return null;
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      };
    },
  }),
];

// Only register Google provider when configured — keeps signup page clean otherwise.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth sign-ins, ensure a users row exists and remember the link.
      if (account?.provider && account.provider !== "credentials") {
        const sql = getDb();
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const existing = await sql`
          SELECT id FROM users WHERE email = ${email} LIMIT 1
        `;
        let userId = existing[0]?.id as string | undefined;
        if (!userId) {
          const inserted = await sql`
            INSERT INTO users (email, name, image)
            VALUES (${email}, ${user.name ?? null}, ${user.image ?? null})
            RETURNING id
          `;
          userId = inserted[0].id as string;
        }
        // Link this OAuth account (idempotent via UNIQUE).
        await sql`
          INSERT INTO auth_accounts (user_id, provider, provider_account_id)
          VALUES (${userId}, ${account.provider}, ${account.providerAccountId})
          ON CONFLICT (provider, provider_account_id) DO NOTHING
        `;
        user.id = userId;
      }
      if (user?.id) {
        await logEvent(user.id, "login", {
          provider: account?.provider ?? "credentials",
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      // For credentials sign-in the id is already on user; OAuth path sets it above.
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
});
