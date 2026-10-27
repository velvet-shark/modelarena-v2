import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PerformanceCharts } from "@/components/performance-charts";
import { getModelPerformance } from "@/lib/data/public";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // Aggregated in the database; averages skip videos without timing data
  const { performanceData, totalModels } = await getModelPerformance();

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
