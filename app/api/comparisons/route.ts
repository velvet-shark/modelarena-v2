import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildGenerationJob,
  enqueueGenerations,
  modelsMissingEndpoint,
} from "@/src/lib/queue/enqueue";
import { apiComparisonSelect } from "@/lib/data/public";
import { z } from "zod";

// Validation schema
const createComparisonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["image-to-video", "text-to-video"]),
  prompt: z.string().min(1).max(10000),
  sourceImageId: z.string().optional(),
  modelIds: z.array(z.string()).min(1).max(20),
  isPublic: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  // Stored in Int columns
  duration: z.number().int().positive().optional(),
  aspectRatio: z.string().optional(),
  seed: z.number().int().optional(),
  additionalParams: z.record(z.unknown()).optional(),
});

// GET /api/comparisons - List comparisons (?public=true for public ones, otherwise admin only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isPublic = searchParams.get("public") === "true";

  if (!isPublic) {
    const { error: denied } = await requireAdmin();
    if (denied) return denied;
  }

  const comparisons = await prisma.comparison.findMany({
    where: isPublic ? { isPublic: true } : {},
    select: { ...apiComparisonSelect, isPublic: true },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(comparisons);
}

// POST /api/comparisons - Create new comparison
export async function POST(request: NextRequest) {
  try {
    const { error: denied } = await requireAdmin();
    if (denied) return denied;

    // Parse and validate request body
    const body = await request.json();
    const data = createComparisonSchema.parse(body);

    // Generate slug from title (fallback for titles with no ASCII letters)
    const slug =
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "comparison";

    // Check if slug already exists
    const existingComparison = await prisma.comparison.findUnique({
      where: { slug },
      select: { id: true },
    });

    const finalSlug = existingComparison
      ? `${slug}-${Date.now()}`
      : slug;

    // Get source image if provided
    let sourceImage = null;
    if (data.sourceImageId) {
      sourceImage = await prisma.sourceImage.findUnique({
        where: { id: data.sourceImageId },
        select: { url: true },
      });
      if (!sourceImage) {
        return NextResponse.json(
          { error: "Source image not found" },
          { status: 404 }
        );
      }
    }

    // Validate models exist and get their details
    const models = await prisma.model.findMany({
      where: {
        id: { in: data.modelIds },
        isActive: true,
      },
      include: {
        provider: true,
      },
    });

    if (models.length !== new Set(data.modelIds).size) {
      return NextResponse.json(
        { error: "One or more models not found or inactive" },
        { status: 404 }
      );
    }

    // Reject up front instead of creating videos that would sit in QUEUED forever
    const unsupported = modelsMissingEndpoint(models, data.type);
    if (unsupported.length > 0) {
      return NextResponse.json(
        { error: `No ${data.type} endpoint for: ${unsupported.join(", ")}` },
        { status: 400 }
      );
    }

    // Comparison and its videos in one write
    const comparison = await prisma.comparison.create({
      data: {
        slug: finalSlug,
        title: data.title,
        description: data.description,
        type: data.type,
        prompt: data.prompt,
        sourceImageId: data.sourceImageId,
        isPublic: data.isPublic,
        isFeatured: data.isFeatured,
        // Persist generation parameters for adding new models later
        aspectRatio: data.aspectRatio,
        duration: data.duration,
        seed: data.seed,
        videos: {
          create: models.map((model) => ({ modelId: model.id, status: "QUEUED" as const })),
        },
      },
      include: { videos: { select: { id: true, modelId: true } } },
    });

    // Enqueue only after the rows are committed (see enqueueGenerations)
    const modelsById = new Map(models.map((m) => [m.id, m]));
    const jobComparison = { ...comparison, sourceImage };
    try {
      await enqueueGenerations(
        comparison.videos.map((video) =>
          buildGenerationJob(video.id, jobComparison, modelsById.get(video.modelId)!, data.additionalParams)
        )
      );
    } catch (queueError) {
      // Leave the videos retryable from the admin UI
      await prisma.video.updateMany({
        where: { comparisonId: comparison.id, status: "QUEUED" },
        data: { status: "FAILED", errorMessage: "Failed to add job to queue" },
      });
      throw queueError;
    }

    // Fetch full comparison with videos for response
    const fullComparison = await prisma.comparison.findUnique({
      where: { id: comparison.id },
      include: {
        sourceImage: true,
        videos: {
          include: {
            model: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(fullComparison, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating comparison:", error);

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
