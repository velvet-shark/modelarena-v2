import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/models/[slug] - Get single model by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const model = await prisma.model.findUnique({
      where: { slug },
      include: {
        provider: true,
        capabilities: true,
        videos: {
          where: {
            status: "COMPLETED",
            comparison: {
              isPublic: true,
            },
          },
          include: {
            comparison: {
              include: {
                sourceImage: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50, // Limit to recent 50 videos
        },
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
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error("[API] Error fetching model:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
