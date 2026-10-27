import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { comparisonUpdateSchema, invalidInput } from "@/lib/admin-input";
import { deleteFiles } from "@/src/lib/storage/r2";
import { revalidatePublicData, apiComparisonSelect } from "@/lib/data/public";

// GET /api/comparisons/[id] - Get a single comparison (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comparison = await prisma.comparison.findFirst({
      where: {
        id,
        isPublic: true,
      },
      select: apiComparisonSelect,
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
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const parsed = comparisonUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput(parsed.error);
    const { tagIds, ...fields } = parsed.data;

    // Callers only check the status and refresh, so return the row alone
    const comparison = await prisma.comparison.update({
      where: { id },
      data: {
        ...fields,
        ...(tagIds && { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } }),
      },
    });

    revalidatePublicData();
    return NextResponse.json({ comparison });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 });
    }
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
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

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

    // Delete the rows first: if this fails, no file has been removed yet and
    // the comparison still plays (videos are cascade deleted)
    await prisma.comparison.delete({
      where: { id },
    });

    const r2Keys = comparison.videos.flatMap((video) => [video.r2Key, video.thumbnailKey]);

    // Delete source image if it exists and is not used by other comparisons
    if (comparison.sourceImage) {
      const otherComparisonsUsingImage = await prisma.comparison.count({
        where: { sourceImageId: comparison.sourceImage.id },
      });

      if (otherComparisonsUsingImage === 0) {
        await prisma.sourceImage.delete({
          where: { id: comparison.sourceImage.id },
        });
        r2Keys.push(comparison.sourceImage.r2Key);
      }
    }

    await deleteFiles(r2Keys);

    revalidatePublicData();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comparison:", error);
    return NextResponse.json(
      { error: "Failed to delete comparison" },
      { status: 500 }
    );
  }
}
