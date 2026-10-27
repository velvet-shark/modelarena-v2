import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePublicData, apiVideoFields, publicCompletedVideo } from "@/lib/data/public";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Validation schema for updating model
const updateModelSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  endpoint: z.string().nullable().optional(),
  endpointT2V: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  defaultParams: z.record(z.unknown()).optional(),
});

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

// PATCH /api/models/[slug] - Update model (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: denied } = await requireAdmin();
    if (denied) return denied;

    const { slug } = await params;

    // Check if model exists
    const existingModel = await prisma.model.findUnique({
      where: { slug },
    });

    if (!existingModel) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const data = updateModelSchema.parse(body);

    // Update model
    const updatedModel = await prisma.model.update({
      where: { slug },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.endpoint !== undefined && { endpoint: data.endpoint }),
        ...(data.endpointT2V !== undefined && { endpointT2V: data.endpointT2V }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.defaultParams && { defaultParams: data.defaultParams as any }),
      },
      include: {
        provider: true,
        capabilities: true,
      },
    });

    revalidatePublicData();
    return NextResponse.json(updatedModel);
  } catch (error) {
    console.error("[API] Error updating model:", error);

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
