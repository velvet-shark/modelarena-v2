import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRecentJobs, type JobStatus } from "@/src/lib/queue/monitor";

const STATUSES: JobStatus[] = ["pending", "active", "completed", "failed"];

export async function GET(req: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as JobStatus | null;
    const status = statusParam && STATUSES.includes(statusParam) ? statusParam : undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100") || 100, 1), 500);

    const jobs = await getRecentJobs(limit, status);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
