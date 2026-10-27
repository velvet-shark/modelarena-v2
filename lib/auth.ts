import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import prisma from "@/lib/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // GitHub sends `iss` in the OAuth callback; @auth/core < 0.41.3 expects authjs.dev and rejects it
      issuer: "https://github.com/login/oauth",
    }),
  ],
  callbacks: {
    // Only admins may sign in, so non-admin GitHub users never get User/Account rows
    async signIn({ user }) {
      return isAdmin(user.email);
    },
    async session({ session, user }: any) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  // Trust the proxy (Coolify/nginx) for HTTPS detection
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

// Dedupe session lookups within one request (layout + page both check)
const getSession = cache(async () => auth());

/**
 * For API routes. Usage:
 *   const { error } = await requireAdmin();
 *   if (error) return error;
 */
export async function requireAdmin(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdmin(session.user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

/**
 * For admin server components. Call in every page that reads data, not only
 * the layout: layouts are not re-rendered on client navigation.
 */
export async function requireAdminPage(): Promise<Session & { user: { email: string } }> {
  const session = await getSession();
  const email = session?.user?.email;
  if (!session || !email) {
    redirect("/auth/signin");
  }
  if (!isAdmin(email)) {
    redirect("/");
  }
  return { ...session, user: { ...session.user, email } };
}
