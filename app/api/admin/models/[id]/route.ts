import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicData } from "@/lib/data/public";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { invalidInput, modelData, modelUpdateSchema } from "@/lib/admin-input";

// PATCH /api/admin/models/[id] - Update a model (any subset of fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const parsed = modelUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput(parsed.error);

    const model = await prisma.model.update({
      where: { id },
      data: modelData(parsed.data),
      include: {
        provider: true,
        capabilities: true,
      },
    });

    revalidatePublicData();
    return NextResponse.json({ model });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
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
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

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

    revalidatePublicData();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
