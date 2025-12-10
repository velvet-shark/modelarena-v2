import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import prisma from "@/lib/prisma";

export default async function ModelsPage() {
  const models = await prisma.model.findMany({
    where: {
      isActive: true,
      videos: {
        some: {
          status: "COMPLETED",
          comparison: {
            isPublic: true,
          },
        },
      },
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
                isPublic: true,
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Group models by brand
  const modelsByBrand = models.reduce((acc, model) => {
    const brandName = model.brand || model.provider.displayName;
    if (!acc[brandName]) {
      acc[brandName] = [];
    }
    acc[brandName].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  const sortedBrands = Object.keys(modelsByBrand).sort();

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Page Header */}
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Models
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore {models.length} AI video generation models across{" "}
            {sortedBrands.length} brands.
          </p>
        </div>

        {/* Models by Brand */}
        <div className="space-y-12">
          {sortedBrands.map((brandName) => {
            const brandModels = modelsByBrand[brandName];
            return (
              <section key={brandName} className="space-y-6">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-2xl font-bold">
                    {brandName}
                  </h2>
                  <span className="text-muted-foreground">
                    {brandModels.length} model
                    {brandModels.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {brandModels.map((model) => (
                    <Link
                      key={model.id}
                      href={`/models/${model.slug}`}
                      className="group block rounded-xl border bg-card p-5 hover:shadow-lg transition-shadow space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {model.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          via {model.provider.displayName}
                        </p>
                      </div>

                      {/* Capabilities */}
                      {model.capabilities.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {model.capabilities.map((cap) => (
                            <span
                              key={cap.id}
                              className="text-xs bg-muted px-2 py-0.5 rounded-full"
                            >
                              {cap.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="text-sm text-muted-foreground">
                        {model._count.videos} video
                        {model._count.videos !== 1 ? "s" : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Empty State */}
        {models.length === 0 && (
          <div className="rounded-2xl bg-muted/50 p-16 text-center">
            <p className="text-muted-foreground">
              No models with generated videos yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Models will appear here once comparisons are created.
            </p>
          </div>
        )}

        <Footer />
      </div>
    </main>
  );
}
