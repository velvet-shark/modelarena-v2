import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { getVoterId, setVoterCookie, voterKey, hashIp, isSameOrigin } from "@/lib/voter";
import { revalidateVotedVideo } from "@/lib/data/public";

// Caps cookie-clearing scripts from one address while still letting a shared
// NAT (office, mobile carrier) cast a few legitimate votes per video.
const MAX_VOTES_PER_IP_PER_VIDEO = 5;

async function guard(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // 10 vote changes per minute per IP
  const limit = await rateLimit(req, {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 10,
    prefix: "vote",
  });
  if (!limit.success) return createRateLimitResponse(limit.reset);
  return null;
}

function respond(body: unknown, init: ResponseInit, voter: { voterId: string; isNew: boolean }) {
  const res = NextResponse.json(body, init);
  if (voter.isNew) setVoterCookie(res, voter.voterId);
  return res;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  const { id } = await params;
  const voter = getVoterId(req);
  const ipHash = hashIp(getClientIp(req));

  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        status: true,
        comparison: { select: { isPublic: true, slug: true } },
        model: { select: { slug: true } },
      },
    });

    if (!video || !video.comparison.isPublic) {
      return respond({ error: "Video not found" }, { status: 404 }, voter);
    }

    if (video.status !== "COMPLETED") {
      return respond({ error: "Can only vote on completed videos" }, { status: 400 }, voter);
    }

    const votesFromIp = await prisma.vote.count({ where: { videoId: id, ipHash } });
    if (votesFromIp >= MAX_VOTES_PER_IP_PER_VIDEO) {
      return respond({ error: "Too many votes from your network" }, { status: 429 }, voter);
    }

    await prisma.$transaction([
      prisma.vote.create({
        data: { videoId: id, fingerprint: voterKey(voter.voterId), ipHash },
      }),
      prisma.video.update({
        where: { id },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    revalidateVotedVideo(video);
    return respond({ success: true }, { status: 200 }, voter);
  } catch (error: any) {
    // Unique constraint violation = already voted
    if (error.code === "P2002") {
      return respond({ error: "Already voted for this video" }, { status: 409 }, voter);
    }
    console.error("Vote error:", error);
    return respond({ error: "Failed to record vote" }, { status: 500 }, voter);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  const { id } = await params;
  const voter = getVoterId(req);

  try {
    const removed = await prisma.$transaction(async (tx) => {
      const { count } = await tx.vote.deleteMany({
        where: { videoId: id, fingerprint: voterKey(voter.voterId) },
      });
      if (count === 0) return null;
      return tx.video.update({
        where: { id },
        data: { voteCount: { decrement: count } },
        select: { comparison: { select: { slug: true } }, model: { select: { slug: true } } },
      });
    });

    if (!removed) {
      return respond({ error: "No vote to remove" }, { status: 404 }, voter);
    }
    revalidateVotedVideo(removed);
    return respond({ success: true }, { status: 200 }, voter);
  } catch (error) {
    console.error("Unvote error:", error);
    return respond({ error: "Failed to remove vote" }, { status: 500 }, voter);
  }
}
