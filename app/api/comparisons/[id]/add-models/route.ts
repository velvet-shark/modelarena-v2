import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generationQueue } from "@/src/lib/queue";
import { z } from "zod";

const addModelsSchema = z.object({
  modelIds: z.array(z.string()).min(1),
});

// POST /api/comparisons/[id]/add-models - Add models to existing comparison
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const data = addModelsSchema.parse(body);

    // Get comparison with source image
    const comparison = await prisma.comparison.findUnique({
      where: { id },
      include: {
        sourceImage: true,
        videos: {
          select: {
            modelId: true,
          },
        },
      },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: "Comparison not found" },
        { status: 404 }
      );
    }

    // Get existing model IDs in this comparison
    const existingModelIds = new Set(comparison.videos.map((v) => v.modelId));

    // Filter out models that already exist
    const newModelIds = data.modelIds.filter((id) => !existingModelIds.has(id));

    if (newModelIds.length === 0) {
      return NextResponse.json(
        { error: "All selected models already exist in this comparison" },
        { status: 400 }
      );
    }

    // Validate models exist and get their details
    const models = await prisma.model.findMany({
      where: {
        id: { in: newModelIds },
        isActive: true,
      },
      include: {
        provider: true,
      },
    });

    if (models.length !== newModelIds.length) {
      return NextResponse.json(
        { error: "One or more models not found or inactive" },
        { status: 404 }
      );
    }

    // Create video records and queue jobs
    const videos = await prisma.$transaction(async (tx) => {
      const createdVideos = await Promise.all(
        models.map((model) =>
          tx.video.create({
            data: {
              comparisonId: comparison.id,
              modelId: model.id,
              status: "QUEUED",
            },
          })
        )
      );

      // Add jobs to queue for each video
      for (let i = 0; i < createdVideos.length; i++) {
        const video = createdVideos[i];
        const model = models[i];

        await generationQueue.add("generate", {
          videoId: video.id,
          comparisonId: comparison.id,
          modelId: model.id,
          prompt: comparison.prompt,
          sourceImageUrl: comparison.sourceImage?.url,
          modelEndpoint: model.endpoint || "",
          providerName: model.provider.name,
        });
      }

      return createdVideos;
    });

    return NextResponse.json({
      success: true,
      videosAdded: videos.length,
      videos,
    });
  } catch (error) {
    console.error("[API] Error adding models to comparison:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
