import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComparisonSearch } from "@/components/comparison-search";
import prisma from "@/lib/prisma";

interface SearchParams {
  type?: string;
  tag?: string;
  q?: string;
  sort?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ComparisonsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Build where clause based on filters
  const whereClause: any = {
    isPublic: true
  };

  if (params.type) {
    whereClause.type = params.type;
  }

  if (params.tag) {
    whereClause.tags = {
      some: {
        slug: params.tag
      }
    };
  }

  if (params.q) {
    whereClause.OR = [
      {
        title: {
          contains: params.q,
          mode: "insensitive"
        }
      },
      {
        description: {
          contains: params.q,
          mode: "insensitive"
        }
      },
      {
        prompt: {
          contains: params.q,
          mode: "insensitive"
        }
      }
    ];
  }

  const comparisons = await prisma.comparison.findMany({
    where: whereClause,
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
      tags: true,
      _count: {
        select: {
          videos: true
        }
      }
    }
  });

  // Calculate total votes per comparison
  const comparisonsWithVotes = comparisons.map((comparison) => {
    const totalVotes = comparison.videos.reduce((sum, video) => sum + video.voteCount, 0);
    return {
      ...comparison,
      totalVotes
    };
  });

  // Sort comparisons based on sort parameter
  const sortOption = params.sort || "votes"; // Default to votes
  const sortedComparisons = [...comparisonsWithVotes].sort((a, b) => {
    switch (sortOption) {
      case "votes":
        // Featured first, then by votes
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return b.totalVotes - a.totalVotes;
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      default:
        return b.totalVotes - a.totalVotes;
    }
  });

  // Get all tags for filter
  const allTags = await prisma.tag.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "image-to-video", label: "Image to Video" },
    { value: "text-to-video", label: "Text to Video" }
  ];

  const sortOptions = [
    { value: "votes", label: "Most Voted" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" }
  ];

  // Build URL with current params
  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (params.type) current.set("type", params.type);
    if (params.tag) current.set("tag", params.tag);
    if (params.q) current.set("q", params.q);
    if (params.sort && params.sort !== "votes") current.set("sort", params.sort);

    // Apply new params
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const queryString = current.toString();
    return `/comparisons${queryString ? `?${queryString}` : ""}`;
  };

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
              <p className="text-muted-foreground">Browse Comparisons</p>
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

        {/* Search */}
        <ComparisonSearch />

        {/* Filters */}
        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Filters</h2>
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <div className="flex gap-2">
              {typeOptions.map((option) => (
                <Link
                  key={option.value}
                  href={buildUrl({ type: option.value || undefined })}
                  className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                    params.type === option.value || (!params.type && option.value === "")
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
                  href={buildUrl({ tag: undefined })}
                  className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                    !params.tag ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  All Tags
                </Link>
                {allTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={buildUrl({ tag: tag.slug })}
                    className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                      params.tag === tag.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results Count & Sort */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <p className="text-sm text-muted-foreground">
            {sortedComparisons.length} comparison{sortedComparisons.length !== 1 ? "s" : ""} found
          </p>
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <div className="flex gap-1">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={buildUrl({ sort: option.value === "votes" ? undefined : option.value })}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      sortOption === option.value
                        ? "bg-primary text-primary-foreground"
                        : "border hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/models">
              <Button variant="ghost">View Models →</Button>
            </Link>
          </div>
        </div>

        {/* Comparisons Grid */}
        {sortedComparisons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedComparisons.map((comparison) => (
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
                    <span className="capitalize">{comparison.type.replace("-", " ")}</span>
                    {comparison.totalVotes > 0 && (
                      <span>👍 {comparison.totalVotes}</span>
                    )}
                  </div>
                  {comparison.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {comparison.tags.map((tag) => (
                        <span key={tag.id} className="text-xs bg-muted px-2 py-1 rounded">
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
            <p className="text-muted-foreground">No comparisons found with the selected filters.</p>
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
