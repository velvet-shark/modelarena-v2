import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PerformanceCharts } from "@/components/performance-charts";
import prisma from "@/lib/prisma";

export default async function AnalyticsPage() {
  // Fetch model performance data
  const models = await prisma.model.findMany({
    where: { isActive: true },
    include: {
      videos: {
        where: {
          comparison: {
            isPublic: true,
          },
        },
        select: {
          status: true,
          generationTime: true,
          duration: true,
          cost: true,
          voteCount: true,
        },
      },
    },
  });

  // Calculate aggregated stats
  const performanceData = models
    .map((model) => {
      const completedVideos = model.videos.filter(
        (v) => v.status === "COMPLETED"
      );
      const failedVideos = model.videos.filter((v) => v.status === "FAILED");

      const avgGenerationTime =
        completedVideos.length > 0
          ? completedVideos.reduce(
              (sum, v) => sum + (v.generationTime || 0),
              0
            ) / completedVideos.length
          : 0;

      const avgDuration =
        completedVideos.length > 0
          ? completedVideos.reduce((sum, v) => sum + (v.duration || 0), 0) /
            completedVideos.length
          : 0;

      const videosWithCost = completedVideos.filter(
        (v) => v.cost !== null && v.cost > 0
      );
      const avgCost =
        videosWithCost.length > 0
          ? videosWithCost.reduce((sum, v) => sum + (v.cost || 0), 0) /
            videosWithCost.length
          : 0;

      const totalVotes = completedVideos.reduce(
        (sum, v) => sum + v.voteCount,
        0
      );

      return {
        modelName: model.name,
        avgGenerationTime,
        avgDuration,
        avgCost,
        totalVideos: model.videos.length,
        completedVideos: completedVideos.length,
        failedVideos: failedVideos.length,
        totalVotes,
      };
    })
    .filter((d) => d.totalVideos > 0);

  const totalModels = models.length;
  const totalVideos = performanceData.reduce((sum, d) => sum + d.totalVideos, 0);
  const completedVideos = performanceData.reduce(
    (sum, d) => sum + d.completedVideos,
    0
  );
  const totalVotes = performanceData.reduce((sum, d) => sum + d.totalVotes, 0);

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Page Header */}
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Analytics
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Performance metrics and statistics across all AI video generation
            models.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="text-sm text-muted-foreground">Total Models</div>
            <div className="font-display text-4xl font-bold mt-2">
              {totalModels}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="text-sm text-muted-foreground">Total Videos</div>
            <div className="font-display text-4xl font-bold mt-2">
              {totalVideos}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="font-display text-4xl font-bold mt-2">
              {completedVideos}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="text-sm text-muted-foreground">Total Votes</div>
            <div className="font-display text-4xl font-bold mt-2">
              {totalVotes}
            </div>
          </div>
        </div>

        {/* Charts */}
        {performanceData.length > 0 ? (
          <PerformanceCharts data={performanceData} />
        ) : (
          <div className="rounded-2xl bg-muted/50 p-16 text-center">
            <p className="text-muted-foreground">
              No performance data available yet. Generate some comparisons to
              see analytics!
            </p>
          </div>
        )}

        <Footer />
      </div>
    </main>
  );
}
