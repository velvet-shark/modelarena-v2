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
    // The queue connection retries forever while Redis is down, so a bare
    // ping() would hang the health check instead of failing it
    await Promise.race([
      getConnection().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timed out")), 2000)),
    ]);
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
