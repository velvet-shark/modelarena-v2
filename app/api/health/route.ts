import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getConnection } from "@/src/lib/queue";

export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; message?: string }> = {
    database: { status: "ok" },
    redis: { status: "ok" },
    app: { status: "ok" },
  };

  let overallStatus = 200;

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    checks.database = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
    overallStatus = 503;
  }

  // Check Redis
  try {
    const redis = getConnection();
    await redis.ping();
  } catch (error) {
    checks.redis = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
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
