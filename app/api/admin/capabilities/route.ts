import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const capabilities = await prisma.capability.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ capabilities });
  } catch (error) {
    console.error("Error fetching capabilities:", error);
    return NextResponse.json(
      { error: "Failed to fetch capabilities" },
      { status: 500 }
    );
  }
}
