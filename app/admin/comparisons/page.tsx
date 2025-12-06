import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ComparisonsPage() {
  const comparisons = await prisma.comparison.findMany({
    include: {
      sourceImage: true,
      videos: {
        select: {
          id: true,
          status: true,
        },
      },
      _count: {
        select: {
          videos: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comparisons</h1>
          <p className="text-muted-foreground">
            Manage all video comparisons ({comparisons.length})
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/generate">New Comparison</Link>
        </Button>
      </div>

      <div className="space-y-4">
        {comparisons.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">No comparisons yet</p>
            <Button asChild>
              <Link href="/admin/generate">Create Your First Comparison</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {comparisons.map((comparison) => {
              const statusCounts = {
                completed: comparison.videos.filter((v) => v.status === "COMPLETED").length,
                processing: comparison.videos.filter(
                  (v) => v.status === "PROCESSING" || v.status === "QUEUED"
                ).length,
                failed: comparison.videos.filter((v) => v.status === "FAILED").length,
              };

              return (
                <Link
                  key={comparison.id}
                  href={`/admin/comparisons/${comparison.id}`}
                  className="border rounded-lg p-6 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{comparison.title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {comparison.type}
                        </span>
                        {comparison.isPublic && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            Public
                          </span>
                        )}
                        {comparison.isFeatured && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            Featured
                          </span>
                        )}
                      </div>

                      {comparison.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {comparison.description}
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {comparison.prompt}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{comparison._count.videos} videos</span>
                        {statusCounts.completed > 0 && (
                          <span className="text-green-600">
                            ✓ {statusCounts.completed} completed
                          </span>
                        )}
                        {statusCounts.processing > 0 && (
                          <span className="text-blue-600">
                            ⏳ {statusCounts.processing} processing
                          </span>
                        )}
                        {statusCounts.failed > 0 && (
                          <span className="text-destructive">
                            ✗ {statusCounts.failed} failed
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(comparison.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {comparison.sourceImage && (
                      <img
                        src={comparison.sourceImage.url}
                        alt=""
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
