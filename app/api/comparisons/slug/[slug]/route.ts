import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/comparisons/slug/[slug] - Get single comparison by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const comparison = await prisma.comparison.findUnique({
      where: { slug },
      include: {
        sourceImage: true,
        videos: {
          where: {
            status: "COMPLETED", // Only return completed videos for public view
          },
          include: {
            model: {
              include: {
                provider: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        tags: true,
      },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: "Comparison not found" },
        { status: 404 }
      );
    }

    // If not public, return 404 (don't reveal it exists)
    if (!comparison.isPublic) {
      return NextResponse.json(
        { error: "Comparison not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("[API] Error fetching comparison:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
