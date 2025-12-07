import Link from "next/link";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function TagsPage() {
  const session = await auth();

  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          comparisons: {
            where: {
              isPublic: true
            }
          }
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  // Filter out tags with no public comparisons
  const tagsWithComparisons = tags.filter((tag) => tag._count.comparisons > 0);

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
              <p className="text-muted-foreground">Browse by Tags</p>
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
          <span>Tags</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Browse by Tags</h2>
          <p className="text-muted-foreground">Explore comparisons organized by {tagsWithComparisons.length} tags.</p>
        </div>

        {/* Tags Grid */}
        {tagsWithComparisons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tagsWithComparisons.map((tag) => (
              <Link
                key={tag.id}
                href={`/comparisons?tag=${tag.slug}`}
                className="group border rounded-lg p-6 hover:shadow-lg transition-shadow space-y-2"
              >
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{tag.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {tag._count.comparisons} comparison
                  {tag._count.comparisons !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No tags with public comparisons found.</p>
            <Link href="/comparisons">
              <Button variant="outline" className="mt-4">
                Browse All Comparisons
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
