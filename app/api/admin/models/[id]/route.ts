import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/admin/models/[id] - Update a model
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
    const { name, endpoint, isActive, costPerSecond, capabilityIds, defaultParams } = body;

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (endpoint !== undefined) updateData.endpoint = endpoint;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (costPerSecond !== undefined)
      updateData.costPerSecond = costPerSecond ? parseFloat(costPerSecond) : null;
    if (defaultParams !== undefined) updateData.defaultParams = defaultParams;

    // Handle capabilities update
    if (capabilityIds !== undefined) {
      // First disconnect all existing capabilities
      await prisma.model.update({
        where: { id },
        data: {
          capabilities: {
            set: [],
          },
        },
      });

      // Then connect the new ones
      if (capabilityIds.length > 0) {
        updateData.capabilities = {
          connect: capabilityIds.map((capId: string) => ({ id: capId })),
        };
      }
    }

    const model = await prisma.model.update({
      where: { id },
      data: updateData,
      include: {
        provider: true,
        capabilities: true,
      },
    });

    return NextResponse.json({ model });
  } catch (error) {
    console.error("Error updating model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/models/[id] - Delete a model
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

    // Check if model has videos
    const videoCount = await prisma.video.count({
      where: { modelId: id },
    });

    if (videoCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete model with ${videoCount} videos. Deactivate it instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.model.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
