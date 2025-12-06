import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Check admin auth
  const session = await auth();
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          // Get job stats
          const [pending, active, completed, failed] = await Promise.all([
            prisma.job.count({ where: { status: "pending" } }),
            prisma.job.count({ where: { status: "active" } }),
            prisma.job.count({ where: { status: "completed" } }),
            prisma.job.count({ where: { status: "failed" } }),
          ]);

          // Get recent jobs
          const jobs = await prisma.job.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
          });

          const data = {
            stats: { pending, active, completed, failed },
            jobs,
            timestamp: new Date().toISOString(),
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch (error) {
          console.error("SSE error:", error);
        }
      };

      // Send initial update
      await sendUpdate();

      // Send updates every 3 seconds
      const interval = setInterval(sendUpdate, 3000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
