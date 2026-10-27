import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicData } from "@/lib/data/public";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { invalidInput, modelCreateSchema } from "@/lib/admin-input";

// GET /api/admin/models - List all models (including inactive)
export async function GET(request: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const models = await prisma.model.findMany({
      include: {
        provider: true,
        capabilities: true,
        _count: {
          select: {
            videos: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

// POST /api/admin/models - Create a new model
export async function POST(request: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = modelCreateSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput(parsed.error);
    // brand and endpointT2V used to be dropped here although the form sends them
    const { slug, providerId, capabilityIds, defaultParams, ...fields } = parsed.data;

    // Check if slug already exists
    const existing = await prisma.model.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Model with this slug already exists" },
        { status: 409 }
      );
    }

    const model = await prisma.model.create({
      data: {
        ...fields,
        slug,
        providerId,
        isActive: fields.isActive ?? true,
        defaultParams: (defaultParams ?? undefined) as Prisma.InputJsonValue | undefined,
        capabilities: capabilityIds?.length
          ? { connect: capabilityIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        provider: true,
        capabilities: true,
      },
    });

    revalidatePublicData();
    return NextResponse.json({ model });
  } catch (error) {
    console.error("Error creating model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}
