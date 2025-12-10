import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ComparisonsListBulk } from "@/components/comparisons-list-bulk";
import Link from "next/link";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export default async function ComparisonsPage() {
  const comparisons = await prisma.comparison.findMany({
    include: {
      sourceImage: true,
      videos: {
        select: {
          id: true,
          status: true,
        },
      },
      _count: {
        select: {
          videos: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comparisons</h1>
          <p className="text-muted-foreground">
            Manage all video comparisons ({comparisons.length})
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/generate">New Comparison</Link>
        </Button>
      </div>

      {comparisons.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No comparisons yet</p>
          <Button asChild>
            <Link href="/admin/generate">Create Your First Comparison</Link>
          </Button>
        </div>
      ) : (
        <ComparisonsListBulk comparisons={comparisons} />
      )}
    </div>
  );
}
