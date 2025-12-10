import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ComparisonSearch } from "@/components/comparison-search";
import { ComparisonCard } from "@/components/comparison-card";
import prisma from "@/lib/prisma";

// Force dynamic rendering - requires database connection
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comparisons",
  description:
    "Browse side-by-side comparisons of AI video generation models. See how Kling, Runway, Veo, Sora, and Hailuo perform on identical prompts.",
  openGraph: {
    title: "AI Video Model Comparisons | ModelArena",
    description:
      "Browse side-by-side comparisons of AI video generation models. See how Kling, Runway, Veo, Sora, and Hailuo perform on identical prompts.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

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

  if (params.q) {
    whereClause.OR = [
      {
        title: {
          contains: params.q,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: params.q,
          mode: "insensitive",
        },
      },
      {
        prompt: {
          contains: params.q,
          mode: "insensitive",
        },
      },
    ];
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
          voteCount: "desc",
        },
      },
      tags: true,
    },
  });

  // Calculate total votes per comparison
  const comparisonsWithVotes = comparisons.map((comparison) => {
    const totalVotes = comparison.videos.reduce(
      (sum, video) => sum + video.voteCount,
      0
    );
    return {
      ...comparison,
      totalVotes,
    };
  });

  // Sort comparisons
  const sortOption = params.sort || "votes";
  const sortedComparisons = [...comparisonsWithVotes].sort((a, b) => {
    switch (sortOption) {
      case "votes":
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return b.totalVotes - a.totalVotes;
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      default:
        return b.totalVotes - a.totalVotes;
    }
  });

  // Get all tags for filter
  const allTags = await prisma.tag.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const typeOptions = [
    { value: "", label: "All" },
    { value: "image-to-video", label: "Image to Video" },
    { value: "text-to-video", label: "Text to Video" },
  ];

  const sortOptions = [
    { value: "votes", label: "Most Voted" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
  ];

  // Build URL with current params
  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (params.type) current.set("type", params.type);
    if (params.tag) current.set("tag", params.tag);
    if (params.q) current.set("q", params.q);
    if (params.sort && params.sort !== "votes")
      current.set("sort", params.sort);

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
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-10">
        {/* Page Header */}
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Comparisons
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Browse side-by-side comparisons of AI video generation models.
          </p>
        </div>

        {/* Filters Row - Type tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Type Filter */}
          <div className="flex gap-1 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0">
            {typeOptions.map((option) => (
              <Link
                key={option.value}
                href={buildUrl({ type: option.value || undefined })}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  params.type === option.value ||
                  (!params.type && option.value === "")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1">
            <ComparisonSearch />
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap -mx-1 px-1 overflow-x-auto pb-1">
            {params.tag && (
              <Link
                href={buildUrl({ tag: undefined })}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap"
              >
                Clear tag
              </Link>
            )}
            {allTags.map((tag) => (
              <Link
                key={tag.id}
                href={buildUrl({ tag: tag.slug })}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  params.tag === tag.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-muted-foreground text-sm sm:text-base">
            <span className="font-display text-foreground font-semibold">
              {sortedComparisons.length}
            </span>{" "}
            comparison{sortedComparisons.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={buildUrl({
                  sort: option.value === "votes" ? undefined : option.value,
                })}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${
                  sortOption === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Comparisons Grid */}
        {sortedComparisons.length > 0 ? (
          <div className="masonry masonry-md-3 masonry-lg-4">
            {sortedComparisons.map((comparison) => (
              <ComparisonCard
                key={comparison.id}
                comparison={comparison}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/50 p-8 sm:p-16 text-center">
            <p className="text-muted-foreground">
              No comparisons found with the selected filters.
            </p>
            <Link
              href="/comparisons"
              className="inline-block mt-4 px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Clear Filters
            </Link>
          </div>
        )}

        <Footer />
      </div>
    </main>
  );
}
