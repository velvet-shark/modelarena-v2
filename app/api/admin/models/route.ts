import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/models - List all models (including inactive)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      slug,
      name,
      providerId,
      endpoint,
      capabilityIds,
      isActive,
      costPerSecond,
    } = body;

    if (!slug || !name || !providerId) {
      return NextResponse.json(
        { error: "Missing required fields: slug, name, providerId" },
        { status: 400 }
      );
    }

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
        slug,
        name,
        providerId,
        endpoint,
        isActive: isActive ?? true,
        costPerSecond: costPerSecond ? parseFloat(costPerSecond) : null,
        capabilities: capabilityIds?.length
          ? {
              connect: capabilityIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        provider: true,
        capabilities: true,
      },
    });

    return NextResponse.json({ model });
  } catch (error) {
    console.error("Error creating model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}
