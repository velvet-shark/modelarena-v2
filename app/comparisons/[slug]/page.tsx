import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ComparisonSidebar } from "@/components/comparison-sidebar";
import { ComparisonVideoGrid } from "@/components/comparison-video-grid";
import prisma from "@/lib/prisma";

interface ComparisonPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ComparisonPageProps): Promise<Metadata> {
  const { slug } = await params;

  const comparison = await prisma.comparison.findUnique({
    where: { slug },
    include: {
      sourceImage: true,
      videos: {
        where: { status: "COMPLETED" },
        take: 1,
      },
    },
  });

  if (!comparison || !comparison.isPublic) {
    return {
      title: "Comparison Not Found",
    };
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://modelarena.ai";
  const ogImageUrl = `${baseUrl}/api/og?type=comparison&slug=${slug}`;

  return {
    title: comparison.title,
    description:
      comparison.description ||
      `Compare AI video generation results from ${
        comparison.videos.length
      } models using the prompt: ${comparison.prompt.slice(0, 150)}...`,
    openGraph: {
      type: "article",
      title: comparison.title,
      description: comparison.description || comparison.prompt,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: comparison.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: comparison.title,
      description: comparison.description || comparison.prompt,
      images: [ogImageUrl],
    },
  };
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { slug } = await params;

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
          voteCount: "desc",
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
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/comparisons"
            className="hover:text-foreground transition-colors"
          >
            Comparisons
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">
            {comparison.title}
          </span>
        </nav>

        {/* Title Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                  {comparison.title}
                </h1>
                {comparison.isFeatured && (
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                    Featured
                  </span>
                )}
              </div>
              {comparison.description && (
                <p className="text-muted-foreground max-w-2xl">
                  {comparison.description}
                </p>
              )}
            </div>
            <Link
              href="/comparisons"
              className="inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium hover:bg-muted transition-colors"
            >
              ← Back
            </Link>
          </div>

          {/* Tags */}
          {comparison.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {comparison.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/comparisons?tag=${tag.slug}`}
                  className="bg-muted px-3 py-1 rounded-full text-sm hover:bg-muted/80 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <ComparisonSidebar
            type={comparison.type}
            modelCount={comparison.videos.length}
            prompt={comparison.prompt}
            totalCost={comparison.videos.reduce(
              (sum, v) => sum + (v.cost ?? 0),
              0
            )}
            avgCost={(() => {
              const videosWithCost = comparison.videos.filter(
                (v) => v.cost !== null && v.cost > 0
              );
              return videosWithCost.length > 0
                ? videosWithCost.reduce((sum, v) => sum + (v.cost ?? 0), 0) /
                    videosWithCost.length
                : 0;
            })()}
            avgGenTime={(() => {
              const videosWithTime = comparison.videos.filter(
                (v) => v.generationTime !== null
              );
              return videosWithTime.length > 0
                ? videosWithTime.reduce(
                    (sum, v) => sum + (v.generationTime ?? 0),
                    0
                  ) / videosWithTime.length
                : 0;
            })()}
            sourceImage={comparison.sourceImage}
          />

          {/* Video Grid */}
          <div className="flex-1 min-w-0">
            <ComparisonVideoGrid
              videos={comparison.videos.map((v) => ({
                id: v.id,
                url: v.url,
                thumbnailUrl: v.thumbnailUrl,
                generationTime: v.generationTime,
                duration: v.duration,
                width: v.width,
                height: v.height,
                cost: v.cost,
                voteCount: v.voteCount,
                createdAt: v.createdAt.toISOString(),
                model: {
                  slug: v.model.slug,
                  name: v.model.name,
                  provider: {
                    displayName: v.model.provider.displayName,
                  },
                },
              }))}
            />
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
