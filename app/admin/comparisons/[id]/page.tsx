import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { VideoRetryButton } from "@/components/video-retry-button";
import { VideoDeleteButton } from "@/components/video-delete-button";
import { VideoCostEditor } from "@/components/video-cost-editor";
import { ComparisonEditForm } from "@/components/comparison-edit-form";
import Link from "next/link";

interface ComparisonPageProps {
  params: Promise<{ id: string }>;
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { id } = await params;

  const [comparison, allTags] = await Promise.all([
    prisma.comparison.findUnique({
      where: { id },
      include: {
        sourceImage: true,
        videos: {
          include: {
            model: {
              include: {
                provider: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        tags: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  if (!comparison) {
    notFound();
  }

  const videosByStatus = {
    pending: comparison.videos.filter((v) => v.status === "PENDING"),
    queued: comparison.videos.filter((v) => v.status === "QUEUED"),
    processing: comparison.videos.filter((v) => v.status === "PROCESSING"),
    completed: comparison.videos.filter((v) => v.status === "COMPLETED"),
    failed: comparison.videos.filter((v) => v.status === "FAILED"),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{comparison.title}</h1>
          <p className="text-muted-foreground">
            {comparison.type} • {comparison.videos.length} videos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/comparisons">Back to List</Link>
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <ComparisonEditForm comparison={comparison} availableTags={allTags} />

      {comparison.description && (
        <div className="border rounded-lg p-4">
          <p className="text-sm">{comparison.description}</p>
        </div>
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Prompt</h2>
        <div className="border rounded-lg p-4 bg-muted/50">
          <p className="text-sm whitespace-pre-wrap">{comparison.prompt}</p>
        </div>
      </div>

      {/* Source Image */}
      {comparison.sourceImage && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Source Image</h2>
          <div className="border rounded-lg p-4">
            <img
              src={comparison.sourceImage.url}
              alt="Source"
              className="max-h-96 mx-auto rounded"
            />
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold">{videosByStatus.pending.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Queued</div>
          <div className="text-2xl font-bold">{videosByStatus.queued.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Processing</div>
          <div className="text-2xl font-bold">{videosByStatus.processing.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold">{videosByStatus.completed.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-2xl font-bold">{videosByStatus.failed.length}</div>
        </div>
      </div>

      {/* Videos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {comparison.videos.map((video) => (
            <div key={video.id} className="border rounded-lg overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {video.status === "COMPLETED" && video.url ? (
                  <video
                    src={video.url}
                    poster={video.thumbnailUrl || undefined}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : video.status === "PROCESSING" || video.status === "QUEUED" ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {video.status.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ) : video.status === "FAILED" ? (
                  <div className="flex items-center justify-center h-full bg-destructive/10">
                    <div className="text-center p-4">
                      <p className="text-sm font-medium text-destructive mb-2">Failed</p>
                      {video.errorMessage && (
                        <p className="text-xs text-muted-foreground">
                          {video.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="font-medium text-sm">{video.model.name}</div>
                <div className="text-xs text-muted-foreground">
                  {video.model.provider.displayName}
                </div>
                {video.status === "COMPLETED" && (
                  <>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {video.generationTime && (
                        <span>⏱ {video.generationTime.toFixed(1)}s</span>
                      )}
                      {video.duration && <span>📹 {video.duration.toFixed(1)}s</span>}
                      {video.width && video.height && (
                        <span>
                          📐 {video.width}×{video.height}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <VideoCostEditor
                        videoId={video.id}
                        currentCost={video.cost}
                      />
                      {video.isManual && (
                        <span className="text-xs text-muted-foreground">
                          (manual)
                        </span>
                      )}
                    </div>
                  </>
                )}
                {video.status === "FAILED" && (
                  <VideoRetryButton videoId={video.id} />
                )}
                <VideoDeleteButton
                  videoId={video.id}
                  modelName={video.model.name}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
