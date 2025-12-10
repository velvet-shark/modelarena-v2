import Link from "next/link";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

export default async function HomePage() {

  // Get public comparisons
  const comparisons = await prisma.comparison.findMany({
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
    take: 6
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
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <Link href="/comparisons">
              <Button size="lg" className="w-full sm:w-auto">Browse Comparisons</Button>
            </Link>
            <Link href="/models">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View Models
              </Button>
            </Link>
            <Link href="/analytics">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Comparisons */}
        {comparisons.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Comparisons</h2>
              <Link href="/comparisons">
                <Button variant="ghost">View All →</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comparisons.map((comparison) => (
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
                    {comparison.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{comparison.description}</p>
                    )}
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
        {comparisons.length === 0 && (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No public comparisons yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
