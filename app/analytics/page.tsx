import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PerformanceCharts } from "@/components/performance-charts";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function AnalyticsPage() {
  const session = await auth();

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
          ? completedVideos.reduce((sum, v) => sum + (v.generationTime || 0), 0) /
            completedVideos.length
          : 0;

      const avgDuration =
        completedVideos.length > 0
          ? completedVideos.reduce((sum, v) => sum + (v.duration || 0), 0) /
            completedVideos.length
          : 0;

      const totalVotes = completedVideos.reduce(
        (sum, v) => sum + v.voteCount,
        0
      );

      return {
        modelName: model.name,
        avgGenerationTime,
        avgDuration,
        totalVideos: model.videos.length,
        completedVideos: completedVideos.length,
        failedVideos: failedVideos.length,
        totalVotes,
      };
    })
    .filter((d) => d.totalVideos > 0); // Only include models with videos

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/">
                <h1 className="text-4xl font-bold mb-2 hover:text-primary transition-colors">
                  ModelArena
                </h1>
              </Link>
              <p className="text-muted-foreground">Performance Analytics</p>
            </div>
            <div className="flex gap-4">
              {session?.user ? (
                <>
                  <span className="text-sm text-muted-foreground self-center">
                    {session.user.email}
                  </span>
                  <Link href="/admin">
                    <Button>Admin Panel</Button>
                  </Link>
                </>
              ) : (
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Navigation */}
        <div className="flex gap-4 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>Analytics</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and statistics across all AI video
            generation models
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Models</div>
            <div className="text-2xl font-bold">{models.length}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Videos</div>
            <div className="text-2xl font-bold">
              {performanceData.reduce((sum, d) => sum + d.totalVideos, 0)}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold">
              {performanceData.reduce((sum, d) => sum + d.completedVideos, 0)}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Votes</div>
            <div className="text-2xl font-bold">
              {performanceData.reduce((sum, d) => sum + d.totalVotes, 0)}
            </div>
          </div>
        </div>

        {/* Charts */}
        {performanceData.length > 0 ? (
          <PerformanceCharts data={performanceData} />
        ) : (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              No performance data available yet. Generate some comparisons to see
              analytics!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
