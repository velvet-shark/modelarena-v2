import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteFile } from "@/lib/storage/r2";

// GET /api/comparisons/[id] - Get a single comparison (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comparison = await prisma.comparison.findUnique({
      where: {
        id,
        isPublic: true,
      },
      include: {
        sourceImage: true,
        tags: true,
        videos: {
          where: {
            status: "COMPLETED",
          },
          include: {
            model: {
              include: {
                provider: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
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

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Error fetching comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison" },
      { status: 500 }
    );
  }
}

// PATCH /api/comparisons/[id] - Update a comparison (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, isPublic, isFeatured, tagIds } = body;

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

    // Handle tags update
    if (tagIds !== undefined) {
      updateData.tags = {
        set: tagIds.map((tagId: string) => ({ id: tagId })),
      };
    }

    const comparison = await prisma.comparison.update({
      where: { id },
      data: updateData,
      include: {
        sourceImage: true,
        tags: true,
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

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("Error updating comparison:", error);
    return NextResponse.json(
      { error: "Failed to update comparison" },
      { status: 500 }
    );
  }
}

// DELETE /api/comparisons/[id] - Delete a comparison (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Fetch comparison with videos and source image before deletion
    const comparison = await prisma.comparison.findUnique({
      where: { id },
      include: {
        videos: true,
        sourceImage: true,
      },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: "Comparison not found" },
        { status: 404 }
      );
    }

    // Delete all R2 files for videos
    const r2DeletePromises: Promise<void>[] = [];

    for (const video of comparison.videos) {
      // Delete video file
      if (video.r2Key) {
        r2DeletePromises.push(
          deleteFile(video.r2Key).catch((err) =>
            console.error(`Failed to delete video ${video.r2Key}:`, err)
          )
        );
      }

      // Delete thumbnail
      if (video.thumbnailKey) {
        r2DeletePromises.push(
          deleteFile(video.thumbnailKey).catch((err) =>
            console.error(`Failed to delete thumbnail ${video.thumbnailKey}:`, err)
          )
        );
      }
    }

    // Delete source image if it exists and is not used by other comparisons
    if (comparison.sourceImage) {
      const sourceImage = comparison.sourceImage;
      const otherComparisonsUsingImage = await prisma.comparison.count({
        where: {
          sourceImageId: comparison.sourceImageId,
          id: { not: id },
        },
      });

      if (otherComparisonsUsingImage === 0) {
        // Safe to delete - no other comparisons use this image
        r2DeletePromises.push(
          deleteFile(sourceImage.r2Key).catch((err) =>
            console.error(
              `Failed to delete source image ${sourceImage.r2Key}:`,
              err
            )
          )
        );

        // Also delete the SourceImage record
        await prisma.sourceImage.delete({
          where: { id: comparison.sourceImageId! },
        });
      }
    }

    // Wait for all R2 deletions to complete (best effort)
    await Promise.all(r2DeletePromises);

    // Delete comparison (videos will be cascade deleted)
    await prisma.comparison.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comparison:", error);
    return NextResponse.json(
      { error: "Failed to delete comparison" },
      { status: 500 }
    );
  }
}
