import Link from "next/link";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface SearchParams {
  type?: string;
  tag?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ComparisonsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();

  // Build where clause based on filters
  const whereClause: any = {
    isPublic: true,
  };

  if (params.type) {
    whereClause.type = params.type;
  }

  if (params.tag) {
    whereClause.tags = {
      some: {
        slug: params.tag,
      },
    };
  }

  const comparisons = await prisma.comparison.findMany({
    where: whereClause,
    include: {
      sourceImage: true,
      videos: {
        where: {
          status: "COMPLETED",
        },
        include: {
          model: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      tags: true,
      _count: {
        select: {
          videos: true,
        },
      },
    },
    orderBy: [
      {
        isFeatured: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  // Get all tags for filter
  const allTags = await prisma.tag.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "image-to-video", label: "Image to Video" },
    { value: "text-to-video", label: "Text to Video" },
  ];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/">
                <h1 className="text-4xl font-bold mb-2 hover:text-primary transition-colors">
                  ModelArena
                </h1>
              </Link>
              <p className="text-muted-foreground">Browse Comparisons</p>
            </div>
            <div className="flex gap-4">
              {session?.user ? (
                <>
                  <span className="text-sm text-muted-foreground self-center">
                    {session.user.email}
                  </span>
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

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Navigation */}
        <div className="flex gap-4 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>Comparisons</span>
        </div>

        {/* Filters */}
        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Filters</h2>
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <div className="flex gap-2">
              {typeOptions.map((option) => (
                <Link
                  key={option.value}
                  href={`/comparisons${option.value ? `?type=${option.value}` : ""}`}
                  className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                    params.type === option.value ||
                    (!params.type && option.value === "")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/comparisons"
                  className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                    !params.tag ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  All Tags
                </Link>
                {allTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/comparisons?tag=${tag.slug}`}
                    className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                      params.tag === tag.slug
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {comparisons.length} comparison{comparisons.length !== 1 ? "s" : ""} found
          </p>
          <Link href="/models">
            <Button variant="ghost">View Models →</Button>
          </Link>
        </div>

        {/* Comparisons Grid */}
        {comparisons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.id}
                href={`/comparisons/${comparison.slug}`}
                className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {comparison.isFeatured && (
                  <div className="bg-primary text-primary-foreground text-xs px-3 py-1 text-center font-medium">
                    Featured
                  </div>
                )}
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comparison.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      {comparison.videos.filter((v) => v.status === "COMPLETED").length} models
                    </span>
                    <span className="capitalize">{comparison.type}</span>
                  </div>
                  {comparison.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {comparison.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="text-xs bg-muted px-2 py-1 rounded"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              No comparisons found with the selected filters.
            </p>
            <Link href="/comparisons">
              <Button variant="outline" className="mt-4">
                Clear Filters
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
