import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ComparisonSidebar } from "@/components/comparison-sidebar";
import { ComparisonVideoGrid } from "@/components/comparison-video-grid";
import prisma from "@/lib/prisma";

interface ComparisonPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ComparisonPageProps): Promise<Metadata> {
  const { slug } = await params;

  const comparison = await prisma.comparison.findUnique({
    where: { slug },
    include: {
      sourceImage: true,
      videos: {
        where: { status: "COMPLETED" },
        take: 1
      }
    }
  });

  if (!comparison || !comparison.isPublic) {
    return {
      title: "Comparison Not Found"
    };
  }

  const imageUrl = comparison.sourceImage?.url || comparison.videos[0]?.thumbnailUrl || "/og-image.png";

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
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: comparison.title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: comparison.title,
      description: comparison.description || comparison.prompt,
      images: [imageUrl]
    }
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
          status: "COMPLETED"
        },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        },
        orderBy: {
          voteCount: "desc"
        }
      },
      tags: true
    }
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
                <img src="/logo.svg" alt="ModelArena" className="h-6 mb-2" />
              </Link>
              <p className="text-muted-foreground">Comparison Details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
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
          <span className="truncate max-w-[200px]">{comparison.title}</span>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{comparison.title}</h1>
              {comparison.isFeatured && (
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded font-medium">
                  Featured
                </span>
              )}
            </div>
            {comparison.description && (
              <p className="text-muted-foreground">{comparison.description}</p>
            )}
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
          <Link href="/comparisons">
            <Button variant="outline">← Back</Button>
          </Link>
        </div>

        {/* Main Content: Sidebar + Videos */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <ComparisonSidebar
            type={comparison.type}
            modelCount={comparison.videos.length}
            prompt={comparison.prompt}
            totalCost={comparison.videos.reduce((sum, v) => sum + (v.cost ?? 0), 0)}
            avgCost={(() => {
              const videosWithCost = comparison.videos.filter((v) => v.cost !== null && v.cost > 0);
              return videosWithCost.length > 0 ? videosWithCost.reduce((sum, v) => sum + (v.cost ?? 0), 0) / videosWithCost.length : 0;
            })()}
            avgGenTime={(() => {
              const videosWithTime = comparison.videos.filter((v) => v.generationTime !== null);
              return videosWithTime.length > 0 ? videosWithTime.reduce((sum, v) => sum + (v.generationTime ?? 0), 0) / videosWithTime.length : 0;
            })()}
            sourceImage={comparison.sourceImage}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Video Grid */}
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
                    displayName: v.model.provider.displayName
                  }
                }
              }))}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
