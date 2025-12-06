import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();

  // Get featured comparisons
  const featuredComparisons = await prisma.comparison.findMany({
    where: {
      isPublic: true,
      isFeatured: true
    },
    include: {
      sourceImage: true,
      videos: {
        where: {
          status: "COMPLETED"
        },
        include: {
          model: true
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      _count: {
        select: {
          videos: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 6
  });

  // Get recent public comparisons
  const recentComparisons = await prisma.comparison.findMany({
    where: {
      isPublic: true
    },
    include: {
      sourceImage: true,
      videos: {
        where: {
          status: "COMPLETED"
        },
        include: {
          model: true
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      _count: {
        select: {
          videos: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 12
  });

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <Link href="/">
              <img src="/logo.svg" alt="ModelArena" className="h-6" />
            </Link>
            <div className="flex gap-4">
              {session?.user ? (
                <>
                  <span className="text-sm text-muted-foreground self-center">{session.user.email}</span>
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

      <div className="max-w-7xl mx-auto p-6 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-3xl font-bold">Compare AI Video Generation Models</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover how different AI models perform on the same prompts and images. Compare quality, speed, and style
            across leading video generation platforms.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/comparisons">
              <Button size="lg">Browse Comparisons</Button>
            </Link>
            <Link href="/models">
              <Button size="lg" variant="outline">
                View Models
              </Button>
            </Link>
            <Link href="/analytics">
              <Button size="lg" variant="outline">
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Comparisons */}
        {featuredComparisons.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Featured Comparisons</h2>
              <Link href="/comparisons">
                <Button variant="ghost">View All →</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredComparisons.map((comparison) => (
                <Link
                  key={comparison.id}
                  href={`/comparisons/${comparison.slug}`}
                  className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-muted relative">
                    {comparison.videos[0]?.thumbnailUrl ? (
                      <img
                        src={comparison.videos[0].thumbnailUrl}
                        alt={comparison.title}
                        className="w-full h-full object-cover"
                      />
                    ) : comparison.sourceImage ? (
                      <img
                        src={comparison.sourceImage.url}
                        alt={comparison.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-muted-foreground">No preview</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{comparison.title}</h3>
                    {comparison.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{comparison.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        {comparison.videos.filter((v) => v.status === "COMPLETED").length} / {comparison._count.videos}{" "}
                        models
                      </span>
                      <span className="capitalize">{comparison.type}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Comparisons */}
        {recentComparisons.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Recent Comparisons</h2>
              <Link href="/comparisons">
                <Button variant="ghost">View All →</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentComparisons.map((comparison) => (
                <Link
                  key={comparison.id}
                  href={`/comparisons/${comparison.slug}`}
                  className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-muted relative">
                    {comparison.videos[0]?.thumbnailUrl ? (
                      <img
                        src={comparison.videos[0].thumbnailUrl}
                        alt={comparison.title}
                        className="w-full h-full object-cover"
                      />
                    ) : comparison.sourceImage ? (
                      <img
                        src={comparison.sourceImage.url}
                        alt={comparison.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-muted-foreground">No preview</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {comparison.title}
                    </h3>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{comparison.videos.filter((v) => v.status === "COMPLETED").length} models</span>
                      <span className="capitalize">{comparison.type}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentComparisons.length === 0 && (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">No public comparisons yet.</p>
            {session?.user && (
              <Link href="/admin/generate">
                <Button>Create Your First Comparison</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
