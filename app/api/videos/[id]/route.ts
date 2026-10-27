import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicData } from "@/lib/data/public";
import prisma from "@/lib/prisma";
import { invalidInput, videoUpdateSchema } from "@/lib/admin-input";
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
    const parsed = videoUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return invalidInput(parsed.error);

    const { count } = await prisma.video.updateMany({
      where: { id },
      data: parsed.data,
    });

    if (count === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    revalidatePublicData();
    return NextResponse.json({ success: true });
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
