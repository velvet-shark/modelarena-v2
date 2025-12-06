import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    // Videos will be cascade deleted due to onDelete: Cascade in schema
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
