import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const providers = await prisma.provider.findMany({
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
