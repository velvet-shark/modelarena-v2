import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  return NextResponse.json({
    session,
    env: {
      hasGithubId: !!process.env.GITHUB_ID,
      hasGithubSecret: !!process.env.GITHUB_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      adminEmails: process.env.ADMIN_EMAILS,
    },
  });
}
