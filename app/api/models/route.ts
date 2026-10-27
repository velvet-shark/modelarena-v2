import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publicCompletedVideo } from "@/lib/data/public";

// GET /api/models - List all active models
export async function GET(request: NextRequest) {
  try {
    const models = await prisma.model.findMany({
      where: {
        isActive: true,
      },
      // No endpoint/defaultParams: provider config isn't public
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        provider: { select: { name: true, displayName: true } },
        capabilities: { select: { name: true } },
        _count: {
          select: {
            videos: { where: publicCompletedVideo },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error("[API] Error fetching models:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
