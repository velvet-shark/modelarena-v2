import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/tags - List all tags with comparison counts
export async function GET(request: NextRequest) {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            comparisons: {
              where: {
                isPublic: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Filter out tags with no public comparisons
    const tagsWithComparisons = tags.filter((tag) => tag._count.comparisons > 0);

    return NextResponse.json(tagsWithComparisons);
  } catch (error) {
    console.error("[API] Error fetching tags:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
