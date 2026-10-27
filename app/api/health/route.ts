import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getConnection } from "@/src/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: "ok" | "error" }> = {
    database: { status: "ok" },
    redis: { status: "ok" },
    app: { status: "ok" },
  };

  let overallStatus = 200;

  // Details go to the server log only; this endpoint is public
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[Health] Database check failed:", error);
    checks.database = { status: "error" };
    overallStatus = 503;
  }

  try {
    const redis = getConnection();
    await redis.ping();
  } catch (error) {
    console.error("[Health] Redis check failed:", error);
    checks.redis = { status: "error" };
    overallStatus = 503;
  }

  return NextResponse.json(
    {
      status: overallStatus === 200 ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: overallStatus }
  );
}
