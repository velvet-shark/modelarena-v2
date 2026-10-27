import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicData } from "@/lib/data/public";
import prisma from "@/lib/prisma";
import { deleteFiles } from "@/src/lib/storage/r2";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/videos/[id]
 * Update video metadata (admin only)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = await req.json();

    // Validate video exists
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};

    // Allow updating cost
    if (body.cost !== undefined) {
      if (body.cost === null || body.cost === "") {
        updateData.cost = null;
      } else {
        const parsedCost = parseFloat(body.cost);
        if (isNaN(parsedCost) || parsedCost < 0) {
          return NextResponse.json(
            { error: "Invalid cost value" },
            { status: 400 }
          );
        }
        updateData.cost = parsedCost;
      }
    }

    // Allow updating generation time
    if (body.generationTime !== undefined) {
      if (body.generationTime === null || body.generationTime === "") {
        updateData.generationTime = null;
      } else {
        const parsedTime = parseFloat(body.generationTime);
        if (isNaN(parsedTime) || parsedTime < 0) {
          return NextResponse.json(
            { error: "Invalid generation time value" },
            { status: 400 }
          );
        }
        updateData.generationTime = parsedTime;
      }
    }

    // Allow updating duration
    if (body.duration !== undefined) {
      if (body.duration === null || body.duration === "") {
        updateData.duration = null;
      } else {
        const parsedDuration = parseFloat(body.duration);
        if (isNaN(parsedDuration) || parsedDuration < 0) {
          return NextResponse.json(
            { error: "Invalid duration value" },
            { status: 400 }
          );
        }
        updateData.duration = parsedDuration;
      }
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update video
    const updatedVideo = await prisma.video.update({
      where: { id },
      data: updateData,
    });

    revalidatePublicData();
    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });
  } catch (error) {
    console.error("Video update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id]
 * Delete a video and its R2 files (admin only)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;

    // Fetch video before deletion
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Row first, then files (best effort), so a failed delete never leaves a
    // video pointing at missing files
    await prisma.video.delete({
      where: { id },
    });

    await deleteFiles([video.r2Key, video.thumbnailKey]);

    revalidatePublicData();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Video deletion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deletion failed" },
      { status: 500 }
    );
  }
}
