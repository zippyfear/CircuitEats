import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

// Auth.js v5. DEV sign-in via Credentials (email → find-or-create user).
// TODO(prod): add Google/GitHub OAuth or email magic-link providers alongside this.
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      name: "Email (dev)",
      credentials: { email: { label: "Email", type: "email" } },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        if (!email || !email.includes("@")) return null;
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email, displayName: email.split("@")[0], reviewerScore: 0.6 },
        });
        return { id: user.id, email: user.email, name: user.displayName ?? null };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = (user as { id: string }).id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.uid) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
});
