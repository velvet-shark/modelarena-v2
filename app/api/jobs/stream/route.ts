import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getJobStats, getRecentJobs, getWorkerCount } from "@/src/lib/queue/monitor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error: denied } = await requireAdmin();
  if (denied) return denied;

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime
        }
      };

      const sendUpdate = async () => {
        if (closed) return;
        try {
          const [stats, jobs, workers] = await Promise.all([
            getJobStats(),
            getRecentJobs(50),
            getWorkerCount(),
          ]);

          const data = {
            stats,
            jobs,
            workers,
            timestamp: new Date().toISOString(),
          };

          if (!closed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }
        } catch (error) {
          console.error("SSE error:", error);
        }
      };

      req.signal.addEventListener("abort", close);

      // Send initial update
      await sendUpdate();

      // Send updates every 3 seconds
      interval = setInterval(sendUpdate, 3000);
    },
    cancel() {
      closed = true;
      clearInterval(interval);
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
