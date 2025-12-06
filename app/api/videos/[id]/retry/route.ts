import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generationQueue } from "@/src/lib/queue";

// POST /api/videos/[id]/retry - Retry failed video generation
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

    const { id: videoId } = await params;

    // Get video with related data
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
        comparison: {
          include: {
            sourceImage: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check if video is in a retryable state
    if (video.status !== "FAILED" && video.status !== "CANCELLED") {
      return NextResponse.json(
        {
          error: `Video is not in a retryable state. Current status: ${video.status}`,
        },
        { status: 400 }
      );
    }

    // Reset video status and clear error
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "QUEUED",
        errorMessage: null,
        url: null,
        r2Key: null,
        thumbnailUrl: null,
        thumbnailKey: null,
        duration: null,
        width: null,
        height: null,
        fileSize: null,
        generationTime: null,
        cost: null,
        apiRequestId: null,
      },
    });

    // Add job to queue
    await generationQueue.add("generate", {
      videoId: video.id,
      comparisonId: video.comparisonId,
      modelId: video.modelId,
      prompt: video.comparison.prompt,
      sourceImageUrl: video.comparison.sourceImage?.url,
      modelEndpoint: video.model.endpoint || "",
      providerName: video.model.provider.name,
    });

    return NextResponse.json({
      success: true,
      message: "Video queued for retry",
      videoId,
    });
  } catch (error) {
    console.error("[API] Error retrying video:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
