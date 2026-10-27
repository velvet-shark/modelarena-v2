import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { getTagList } from "@/lib/data/public";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse AI video model comparisons by topic.",
  openGraph: {
    title: "Browse by Tags | ModelArena",
    description: "Browse AI video model comparisons by topic.",
    images: ["/og-image.png"],
  },
};

export default async function TagsPage() {
  const tags = await getTagList();

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Browse by tags</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore comparisons organized by {tags.length} {tags.length === 1 ? "tag" : "tags"}.
          </p>
        </div>

        {tags.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/comparisons?tag=${tag.slug}`}
                className="group border rounded-lg p-6 hover:shadow-lg transition-shadow space-y-2"
              >
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">{tag.name}</h2>
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
            <Button asChild variant="outline" className="mt-4">
              <Link href="/comparisons">Browse all comparisons</Link>
            </Button>
          </div>
        )}

        <Footer />
      </div>
    </main>
  );
}
