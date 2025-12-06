import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { fingerprint } = await req.json();

  if (!fingerprint) {
    return NextResponse.json(
      { error: "Fingerprint required" },
      { status: 400 }
    );
  }

  // Get IP address for hashing
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  try {
    // Check if video exists and is completed
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only vote on completed videos" },
        { status: 400 }
      );
    }

    // Create vote
    await prisma.vote.create({
      data: {
        videoId: id,
        fingerprint,
        ipHash,
      },
    });

    // Update vote count
    await prisma.video.update({
      where: { id },
      data: { voteCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Unique constraint violation = already voted
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Already voted for this video" },
        { status: 409 }
      );
    }
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { fingerprint } = await req.json();

  if (!fingerprint) {
    return NextResponse.json(
      { error: "Fingerprint required" },
      { status: 400 }
    );
  }

  try {
    // Delete vote
    await prisma.vote.delete({
      where: {
        videoId_fingerprint: {
          videoId: id,
          fingerprint,
        },
      },
    });

    // Update vote count
    await prisma.video.update({
      where: { id },
      data: { voteCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unvote error:", error);
    return NextResponse.json(
      { error: "Failed to remove vote" },
      { status: 500 }
    );
  }
}
