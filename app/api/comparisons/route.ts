import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGenerationQueue } from "@/src/lib/queue";
import { z } from "zod";

// Validation schema
const createComparisonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["image-to-video", "text-to-video"]),
  prompt: z.string().min(1),
  sourceImageId: z.string().optional(),
  modelIds: z.array(z.string()).min(1).max(20),
  isPublic: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  duration: z.number().optional(),
  aspectRatio: z.string().optional(),
  seed: z.number().optional(),
  additionalParams: z.record(z.unknown()).optional(),
});

// GET /api/comparisons - List all comparisons
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isPublic = searchParams.get("public") === "true";

  const comparisons = await prisma.comparison.findMany({
    where: isPublic ? { isPublic: true } : {},
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
      tags: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(comparisons);
}

// POST /api/comparisons - Create new comparison
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const data = createComparisonSchema.parse(body);

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existingComparison = await prisma.comparison.findUnique({
      where: { slug },
    });

    const finalSlug = existingComparison
      ? `${slug}-${Date.now()}`
      : slug;

    // Get source image if provided
    let sourceImage = null;
    if (data.sourceImageId) {
      sourceImage = await prisma.sourceImage.findUnique({
        where: { id: data.sourceImageId },
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

    if (models.length !== data.modelIds.length) {
      return NextResponse.json(
        { error: "One or more models not found or inactive" },
        { status: 404 }
      );
    }

    // Create comparison and videos in a transaction
    const comparison = await prisma.$transaction(async (tx) => {
      // Create comparison
      const comp = await tx.comparison.create({
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
        },
      });

      // Create video records for each model
      const videos = await Promise.all(
        models.map((model) =>
          tx.video.create({
            data: {
              comparisonId: comp.id,
              modelId: model.id,
              status: "QUEUED",
            },
          })
        )
      );

      // Add jobs to queue for each video
      const isImageToVideo = data.type === "image-to-video";
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const model = models[i];

        // Select correct endpoint based on generation type
        const endpoint = isImageToVideo ? model.endpoint : model.endpointT2V;
        if (!endpoint) {
          console.warn(`[API] Model ${model.name} has no ${isImageToVideo ? 'I2V' : 'T2V'} endpoint, skipping`);
          continue;
        }

        await getGenerationQueue().add("generate", {
          videoId: video.id,
          comparisonId: comp.id,
          modelId: model.id,
          prompt: data.prompt,
          sourceImageUrl: sourceImage?.url,
          modelEndpoint: endpoint,
          providerName: model.provider.name,
          duration: data.duration,
          aspectRatio: data.aspectRatio,
          seed: data.seed,
          additionalParams: data.additionalParams,
        });
      }

      return comp;
    });

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
