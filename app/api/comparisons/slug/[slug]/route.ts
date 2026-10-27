import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiComparisonSelect } from "@/lib/data/public";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/comparisons/slug/[slug] - Get single public comparison by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Private comparisons 404 too (don't reveal they exist)
    const comparison = await prisma.comparison.findFirst({
      where: { slug, isPublic: true },
      select: apiComparisonSelect,
    });

    if (!comparison) {
      return NextResponse.json(
        { error: "Comparison not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("[API] Error fetching comparison:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
