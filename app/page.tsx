import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HomeMasonryGallery } from "@/components/home-masonry-gallery";
import { ComparisonCard } from "@/components/comparison-card";
import prisma from "@/lib/prisma";

export default async function HomePage() {
  // Get public comparisons with their videos
  const comparisons = await prisma.comparison.findMany({
    where: {
      isPublic: true,
    },
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
          voteCount: "desc",
        },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  // Flatten to get all videos with their comparison context
  const allVideos = comparisons.flatMap((comparison) =>
    comparison.videos.map((video) => ({
      id: video.id,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      width: video.width,
      height: video.height,
      voteCount: video.voteCount,
      comparison: {
        slug: comparison.slug,
        title: comparison.title,
      },
      model: {
        name: video.model.name,
        slug: video.model.slug,
      },
    }))
  );

  // Get stats
  const modelCount = await prisma.model.count({
    where: {
      isActive: true,
      videos: {
        some: {
          status: "COMPLETED",
          comparison: { isPublic: true },
        },
      },
    },
  });

  const comparisonCount = await prisma.comparison.count({
    where: { isPublic: true },
  });

  // Get latest 6 comparisons for the "Latest Comparisons" section
  const latestComparisons = await prisma.comparison.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      sourceImage: true,
      videos: {
        where: { status: "COMPLETED" },
        include: { model: true },
        orderBy: { voteCount: "desc" },
      },
      tags: true,
    },
  });

  // Calculate totalVotes for each comparison
  const latestComparisonsWithVotes = latestComparisons.map((comparison) => ({
    ...comparison,
    totalVotes: comparison.videos.reduce((sum, v) => sum + v.voteCount, 0),
  }));

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Compare AI
            <br />
            Video Models
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            See how different AI models perform on identical prompts. Compare
            quality, speed, and style across leading video generation platforms.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/comparisons"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              Browse Comparisons
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center justify-center rounded-full border px-8 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              View All Models
            </Link>
          </div>
          <div className="mt-12 flex gap-12">
            <div>
              <div className="font-display text-3xl font-bold">{modelCount}</div>
              <div className="text-sm text-muted-foreground">AI Models</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">{comparisonCount}</div>
              <div className="text-sm text-muted-foreground">Comparisons</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">{allVideos.length}</div>
              <div className="text-sm text-muted-foreground">Videos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Comparisons */}
      {latestComparisonsWithVotes.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl font-bold">Latest Comparisons</h2>
            <Link
              href="/comparisons"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="masonry masonry-md-3 masonry-lg-4">
            {latestComparisonsWithVotes.map((comparison) => (
              <ComparisonCard key={comparison.id} comparison={comparison} />
            ))}
          </div>
        </section>
      )}

      {/* Video Gallery */}
      {allVideos.length > 0 && (
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-6 mb-8">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold">Latest Videos</h2>
              <Link
                href="/comparisons"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all comparisons →
              </Link>
            </div>
          </div>
          <HomeMasonryGallery videos={allVideos} />
        </section>
      )}

      {/* Empty State */}
      {allVideos.length === 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="rounded-2xl bg-muted/50 p-16 text-center">
            <p className="text-muted-foreground">No videos yet.</p>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
