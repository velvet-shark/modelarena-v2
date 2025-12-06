import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlayAllButton } from "@/components/play-all-button";
import { VoteButton } from "@/components/vote-button";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface ComparisonPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { slug } = await params;
  const session = await auth();

  const comparison = await prisma.comparison.findUnique({
    where: { slug },
    include: {
      sourceImage: true,
      videos: {
        where: {
          status: "COMPLETED",
        },
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
  });

  if (!comparison || !comparison.isPublic) {
    notFound();
  }

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
              <p className="text-muted-foreground">Comparison Details</p>
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
          <Link href="/comparisons" className="text-muted-foreground hover:text-foreground">
            Comparisons
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>{comparison.title}</span>
        </div>

        {/* Title and Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{comparison.title}</h1>
                {comparison.isFeatured && (
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded font-medium">
                    Featured
                  </span>
                )}
              </div>
              {comparison.description && (
                <p className="text-muted-foreground">{comparison.description}</p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{comparison.videos.length} models compared</span>
                <span>•</span>
                <span className="capitalize">{comparison.type}</span>
              </div>
            </div>
            <Link href="/comparisons">
              <Button variant="outline">← Back to Browse</Button>
            </Link>
          </div>

          {/* Tags */}
          {comparison.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {comparison.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/comparisons?tag=${tag.slug}`}
                  className="bg-muted px-3 py-1 rounded-md text-sm hover:bg-muted/80 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>

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
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={comparison.sourceImage.url}
                alt="Source"
                className="max-h-96 mx-auto rounded"
              />
            </div>
          </div>
        )}

        {/* Videos */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Generated Videos</h2>
            <p className="text-sm text-muted-foreground">
              {comparison.videos.length} model{comparison.videos.length !== 1 ? "s" : ""}
            </p>
          </div>

          {comparison.videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {comparison.videos.map((video) => (
                <div key={video.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    <video
                      src={video.url || ""}
                      poster={video.thumbnailUrl || undefined}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="space-y-1">
                      <Link
                        href={`/models/${video.model.slug}`}
                        className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
                      >
                        {video.model.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {video.model.provider.displayName}
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                      {video.generationTime && (
                        <span title="Generation time">
                          ⏱ {video.generationTime.toFixed(1)}s
                        </span>
                      )}
                      {video.duration && (
                        <span title="Video duration">
                          📹 {video.duration.toFixed(1)}s
                        </span>
                      )}
                      {video.width && video.height && (
                        <span title="Resolution">
                          📐 {video.width}×{video.height}
                        </span>
                      )}
                    </div>
                    <VoteButton
                      videoId={video.id}
                      initialVoteCount={video.voteCount}
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-muted-foreground">
                No completed videos yet for this comparison.
              </p>
            </div>
          )}
        </div>

        {/* Play All Button */}
        {comparison.videos.length > 1 && (
          <div className="flex justify-center">
            <PlayAllButton />
          </div>
        )}
      </div>
    </main>
  );
}
