import Link from "next/link";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function ModelsPage() {
  const session = await auth();

  const models = await prisma.model.findMany({
    where: {
      isActive: true
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

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    const providerName = model.provider.displayName;
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

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
          <span>Models</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">AI Video Generation Models</h2>
          <p className="text-muted-foreground">Explore {models.length} active models across different providers.</p>
        </div>

        {/* Models by Provider */}
        <div className="space-y-8">
          {Object.entries(modelsByProvider).map(([providerName, providerModels]) => (
            <div key={providerName} className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2">
                {providerName} ({providerModels.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {providerModels.map((model) => (
                  <Link
                    key={model.id}
                    href={`/models/${model.slug}`}
                    className="group border rounded-lg p-4 hover:shadow-lg transition-shadow space-y-3"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">{model.name}</h4>
                      <p className="text-xs text-muted-foreground">{model.provider.displayName}</p>
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
          ))}
        </div>

        {/* Empty State */}
        {models.length === 0 && (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No active models found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
