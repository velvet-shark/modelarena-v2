import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildGenerationJob,
  enqueueGenerations,
  modelsMissingEndpoint,
} from "@/src/lib/queue/enqueue";
import { z } from "zod";

const addModelsSchema = z.object({
  modelIds: z.array(z.string()).min(1).max(20),
});

// POST /api/comparisons/[id]/add-models - Add models to existing comparison
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: denied } = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const data = addModelsSchema.parse(body);

    // Get comparison with source image
    const comparison = await prisma.comparison.findUnique({
      where: { id },
      include: {
        sourceImage: { select: { url: true } },
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
    const newModelIds = [...new Set(data.modelIds)].filter((id) => !existingModelIds.has(id));

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

    // Reject up front instead of creating videos that would sit in QUEUED forever
    const unsupported = modelsMissingEndpoint(models, comparison.type);
    if (unsupported.length > 0) {
      return NextResponse.json(
        { error: `No ${comparison.type} endpoint for: ${unsupported.join(", ")}` },
        { status: 400 }
      );
    }

    const videos = await prisma.video.createManyAndReturn({
      data: models.map((model) => ({
        comparisonId: comparison.id,
        modelId: model.id,
        status: "QUEUED" as const,
      })),
    });

    // Enqueue only after the rows are committed, using the comparison's saved parameters
    const modelsById = new Map(models.map((m) => [m.id, m]));
    try {
      await enqueueGenerations(
        videos.map((video) =>
          buildGenerationJob(video.id, comparison, modelsById.get(video.modelId)!)
        )
      );
    } catch (queueError) {
      // Leave the videos retryable from the admin UI
      await prisma.video.updateMany({
        where: { id: { in: videos.map((v) => v.id) } },
        data: { status: "FAILED", errorMessage: "Failed to add job to queue" },
      });
      throw queueError;
    }

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
