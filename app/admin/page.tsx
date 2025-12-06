import prisma from "@/lib/prisma";

export default async function AdminDashboard() {
  const stats = await Promise.all([
    prisma.comparison.count(),
    prisma.video.count(),
    prisma.model.count({ where: { isActive: true } }),
    prisma.video.count({ where: { status: "PROCESSING" } }),
  ]);

  const [comparisons, videos, models, processing] = stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to ModelArena admin panel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Total Comparisons
          </div>
          <div className="text-3xl font-bold mt-2">{comparisons}</div>
        </div>
        <div className="border rounded-lg p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Total Videos
          </div>
          <div className="text-3xl font-bold mt-2">{videos}</div>
        </div>
        <div className="border rounded-lg p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Active Models
          </div>
          <div className="text-3xl font-bold mt-2">{models}</div>
        </div>
        <div className="border rounded-lg p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Processing
          </div>
          <div className="text-3xl font-bold mt-2">{processing}</div>
        </div>
      </div>
    </div>
  );
}
