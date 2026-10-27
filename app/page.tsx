import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HomeMasonryGallery } from "@/components/home-masonry-gallery";
import { ComparisonCard } from "@/components/comparison-card";
import { getHomeData } from "@/lib/data/public";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    latestComparisons: latestComparisonsWithVotes,
    videos: allVideos,
    modelCount,
    comparisonCount,
    videoCount,
  } = await getHomeData();

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Compare AI
            <br />
            Video Models
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-xl">
            See how different AI models perform on identical prompts. Compare
            quality, speed, and style across leading video generation platforms.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/comparisons"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 sm:px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              Browse Comparisons
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center justify-center rounded-full border px-6 sm:px-8 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              View All Models
            </Link>
          </div>
          <div className="mt-8 sm:mt-12 flex gap-6 sm:gap-8 md:gap-12">
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold">{modelCount}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">AI Models</div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold">{comparisonCount}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Comparisons</div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-bold">{videoCount}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Videos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Comparisons */}
      {latestComparisonsWithVotes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="flex items-baseline justify-between mb-6 sm:mb-8">
            <h2 className="font-display text-xl sm:text-2xl font-bold">Latest Comparisons</h2>
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
        <section className="pb-12 sm:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl sm:text-2xl font-bold">Latest Videos</h2>
              <Link
                href="/comparisons"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all →
              </Link>
            </div>
          </div>
          <HomeMasonryGallery videos={allVideos} />
        </section>
      )}

      {/* Empty State */}
      {allVideos.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
          <div className="rounded-2xl bg-muted/50 p-8 sm:p-16 text-center">
            <p className="text-muted-foreground">No videos yet.</p>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
