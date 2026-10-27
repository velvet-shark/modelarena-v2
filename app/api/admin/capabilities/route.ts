import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

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
