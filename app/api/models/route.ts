import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/models - List all active models
export async function GET(request: NextRequest) {
  try {
    const models = await prisma.model.findMany({
      where: {
        isActive: true,
      },
      include: {
        provider: true,
        capabilities: true,
        _count: {
          select: {
            videos: {
              where: {
                status: "COMPLETED",
              },
            },
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
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
