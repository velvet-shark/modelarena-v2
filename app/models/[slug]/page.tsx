import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModelVideoGrid } from "@/components/model-video-grid";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCost } from "@/src/lib/format-cost";

interface ModelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params;
  const session = await auth();

  const model = await prisma.model.findUnique({
    where: { slug },
    include: {
      provider: true,
      capabilities: true,
      videos: {
        where: {
          status: "COMPLETED",
          comparison: {
            isPublic: true
          }
        },
        include: {
          comparison: {
            include: {
              sourceImage: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      },
      _count: {
        select: {
          videos: {
            where: {
              status: "COMPLETED"
            }
          }
        }
      }
    }
  });

  if (!model) {
    notFound();
  }

  // Calculate average metrics
  const completedVideos = model.videos.filter((v) => v.generationTime);
  const avgGenerationTime =
    completedVideos.length > 0
      ? completedVideos.reduce((sum, v) => sum + (v.generationTime || 0), 0) / completedVideos.length
      : null;

  const avgDuration =
    completedVideos.length > 0
      ? completedVideos.reduce((sum, v) => sum + (v.duration || 0), 0) / completedVideos.length
      : null;

  const videosWithCost = model.videos.filter((v) => v.cost !== null);
  const avgCost =
    videosWithCost.length > 0
      ? videosWithCost.reduce((sum, v) => sum + (v.cost || 0), 0) / videosWithCost.length
      : null;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/">
                <img src="/logo.svg" alt="ModelArena" className="h-6 mb-2" />
              </Link>
              <p className="text-muted-foreground">Model Details</p>
            </div>
            <div className="flex gap-4">
              {session?.user ? (
                <>
                  <span className="text-sm text-muted-foreground self-center">{session.user.email}</span>
                  <Link href="/admin">
                    <Button>Admin Panel</Button>
                  </Link>
                </>
              ) : null}
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
          <Link href="/models" className="text-muted-foreground hover:text-foreground">
            Models
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>{model.name}</span>
        </div>

        {/* Model Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{model.name}</h1>
              <p className="text-muted-foreground">Provider: {model.provider.displayName}</p>
              {model.capabilities.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {model.capabilities.map((cap) => (
                    <span key={cap.id} className="bg-muted px-3 py-1 rounded-md text-sm">
                      {cap.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Link href="/models">
              <Button variant="outline">← Back to Models</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Videos</div>
            <div className="text-2xl font-bold">{model._count.videos}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Public Videos</div>
            <div className="text-2xl font-bold">{model.videos.length}</div>
          </div>
          {avgGenerationTime && (
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Avg Gen Time</div>
              <div className="text-2xl font-bold">{avgGenerationTime.toFixed(1)}s</div>
            </div>
          )}
          {avgDuration && (
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Avg Duration</div>
              <div className="text-2xl font-bold">{avgDuration.toFixed(1)}s</div>
            </div>
          )}
          {avgCost !== null && (
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Avg Cost</div>
              <div className="text-2xl font-bold">{formatCost(avgCost)}</div>
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Videos</h2>
          <ModelVideoGrid videos={model.videos} />
        </div>
      </div>
    </main>
  );
}
