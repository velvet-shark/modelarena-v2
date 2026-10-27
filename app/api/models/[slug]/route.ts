import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiVideoFields, publicCompletedVideo } from "@/lib/data/public";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/models/[slug] - Get single model by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const model = await prisma.model.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        isActive: true,
        provider: { select: { name: true, displayName: true } },
        capabilities: { select: { name: true } },
        videos: {
          where: publicCompletedVideo,
          select: {
            ...apiVideoFields,
            comparison: {
              select: {
                slug: true,
                title: true,
                prompt: true,
                sourceImage: { select: { url: true, width: true, height: true } },
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
            videos: { where: publicCompletedVideo },
          },
        },
      },
    });

    // Same rule as the model page: hide inactive models with nothing public
    if (!model || (!model.isActive && model._count.videos === 0)) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error("[API] Error fetching model:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
