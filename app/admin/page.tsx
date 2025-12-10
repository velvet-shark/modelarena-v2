import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    totalComparisons,
    publicComparisons,
    featuredComparisons,
    totalVideos,
    activeModels,
    videoStatusCounts,
    jobStatusCounts,
    recentComparisons,
  ] = await Promise.all([
    prisma.comparison.count(),
    prisma.comparison.count({ where: { isPublic: true } }),
    prisma.comparison.count({ where: { isFeatured: true } }),
    prisma.video.count(),
    prisma.model.count({ where: { isActive: true } }),
    prisma.video.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.job.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.comparison.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        videos: {
          select: { status: true },
        },
      },
    }),
  ]);

  const videoStats = {
    pending: videoStatusCounts.find((s) => s.status === "PENDING")?._count.status || 0,
    queued: videoStatusCounts.find((s) => s.status === "QUEUED")?._count.status || 0,
    processing: videoStatusCounts.find((s) => s.status === "PROCESSING")?._count.status || 0,
    completed: videoStatusCounts.find((s) => s.status === "COMPLETED")?._count.status || 0,
    failed: videoStatusCounts.find((s) => s.status === "FAILED")?._count.status || 0,
  };

  const jobStats = {
    pending: jobStatusCounts.find((s) => s.status === "pending")?._count.status || 0,
    active: jobStatusCounts.find((s) => s.status === "active")?._count.status || 0,
    completed: jobStatusCounts.find((s) => s.status === "completed")?._count.status || 0,
    failed: jobStatusCounts.find((s) => s.status === "failed")?._count.status || 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to ModelArena admin panel
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/generate">New Comparison</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/upload">Upload Video</Link>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Total Comparisons
            </div>
            <div className="text-3xl font-bold mt-2">{totalComparisons}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {publicComparisons} public • {featuredComparisons} featured
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Total Videos
            </div>
            <div className="text-3xl font-bold mt-2">{totalVideos}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {videoStats.completed} completed
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Active Models
            </div>
            <div className="text-3xl font-bold mt-2">{activeModels}</div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Processing
            </div>
            <div className="text-3xl font-bold mt-2">
              {videoStats.processing + videoStats.queued}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {videoStats.queued} queued • {videoStats.processing} active
            </div>
          </div>
        </div>
      </div>

      {/* Video Status Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Video Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold mt-1">{videoStats.pending}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Queued</div>
            <div className="text-2xl font-bold mt-1">{videoStats.queued}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Processing</div>
            <div className="text-2xl font-bold mt-1">{videoStats.processing}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{videoStats.completed}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{videoStats.failed}</div>
          </div>
        </div>
      </div>

      {/* Job Queue Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Job Queue</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/jobs">View All →</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold mt-1">{jobStats.pending}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Active</div>
            <div className="text-2xl font-bold mt-1">{jobStats.active}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{jobStats.completed}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{jobStats.failed}</div>
          </div>
        </div>
      </div>

      {/* Recent Comparisons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Comparisons</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/comparisons">View All →</Link>
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {recentComparisons.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No comparisons yet. Create your first one!
            </div>
          ) : (
            recentComparisons.map((comparison) => {
              const completed = comparison.videos.filter((v) => v.status === "COMPLETED").length;
              const total = comparison.videos.length;
              return (
                <Link
                  key={comparison.id}
                  href={`/admin/comparisons/${comparison.id}`}
                  className="block p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{comparison.title}</div>
                      <div className="text-sm text-muted-foreground truncate mt-1">
                        {comparison.type} • {new Date(comparison.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-sm text-muted-foreground">
                        {completed}/{total} videos
                      </div>
                      {comparison.isPublic && (
                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Public
                        </div>
                      )}
                      {comparison.isFeatured && (
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Featured
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
