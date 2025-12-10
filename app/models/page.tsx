import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function ModelsPage() {

  const models = await prisma.model.findMany({
    where: {
      isActive: true,
      // Only show models with at least 1 completed public video
      videos: {
        some: {
          status: "COMPLETED",
          comparison: {
            isPublic: true
          }
        }
      }
    },
    include: {
      provider: true,
      capabilities: true,
      _count: {
        select: {
          videos: {
            where: {
              status: "COMPLETED",
              comparison: {
                isPublic: true
              }
            }
          }
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  // Group models by brand (fallback to provider name if no brand)
  const modelsByBrand = models.reduce((acc, model) => {
    const brandName = model.brand || model.provider.displayName;
    if (!acc[brandName]) {
      acc[brandName] = [];
    }
    acc[brandName].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  // Sort brands alphabetically
  const sortedBrands = Object.keys(modelsByBrand).sort();

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
              <p className="text-muted-foreground">Browse Models</p>
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
          <span>Models</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">AI Video Generation Models</h2>
          <p className="text-muted-foreground">
            Explore {models.length} models across {sortedBrands.length} brands with generated videos.
          </p>
        </div>

        {/* Models by Brand */}
        <div className="space-y-8">
          {sortedBrands.map((brandName) => {
            const brandModels = modelsByBrand[brandName];
            return (
              <div key={brandName} className="space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2">
                  {brandName} ({brandModels.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {brandModels.map((model) => (
                    <Link
                      key={model.id}
                      href={`/models/${model.slug}`}
                      className="group border rounded-lg p-4 hover:shadow-lg transition-shadow space-y-3"
                    >
                      <div className="space-y-1">
                        <h4 className="font-semibold group-hover:text-primary transition-colors">{model.name}</h4>
                        <p className="text-xs text-muted-foreground">via {model.provider.displayName}</p>
                      </div>

                      {/* Capabilities */}
                      {model.capabilities.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {model.capabilities.map((cap) => (
                            <span key={cap.id} className="text-xs bg-muted px-2 py-1 rounded">
                              {cap.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span title="Completed videos">📹 {model._count.videos} videos</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {models.length === 0 && (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No models with generated videos yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Models will appear here once comparisons are created.</p>
          </div>
        )}
      </div>
    </main>
  );
}
