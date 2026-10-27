import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { ComparisonCardData } from "@/components/comparison-card";

// Data loaders for public pages. Every query selects only the fields the page
// renders, so admin/debug columns (apiResponse, r2Key, endpoint, defaultParams,
// errorMessage) never reach the client.
//
// Results go through the Next data cache (so they must stay serializable).
// Entries expire after a minute, which is how videos the worker finishes show
// up. Admin changes clear everything at once; a vote clears the comparison
// and model pages it changed.

const PUBLIC_TAG = "public-data";
const REVALIDATE_SECONDS = 60;
const comparisonTag = (slug: string) => `comparison:${slug}`;
const modelTag = (slug: string) => `model:${slug}`;

export function revalidatePublicData() {
  revalidateTag(PUBLIC_TAG);
}

export function revalidateVotedVideo(video: {
  comparison: { slug: string };
  model: { slug: string };
}) {
  revalidateTag(comparisonTag(video.comparison.slug));
  revalidateTag(modelTag(video.model.slug));
}

function cached<Args extends unknown[], Result>(
  load: (...args: Args) => Promise<Result>,
  key: string,
  tags: string[] = []
) {
  return unstable_cache(load, [key], {
    revalidate: REVALIDATE_SECONDS,
    tags: [PUBLIC_TAG, ...tags],
  });
}

export const publicCompletedVideo = {
  status: "COMPLETED",
  comparison: { isPublic: true },
} satisfies Prisma.VideoWhereInput;

const comparisonCardSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  isFeatured: true,
  sourceImage: { select: { url: true } },
  tags: { select: { id: true, name: true, slug: true } },
  videos: {
    where: { status: "COMPLETED" },
    orderBy: { voteCount: "desc" },
    take: 1,
    select: { url: true, thumbnailUrl: true, width: true, height: true },
  },
  _count: { select: { videos: { where: { status: "COMPLETED" } } } },
} satisfies Prisma.ComparisonSelect;

type ComparisonCardRow = Prisma.ComparisonGetPayload<{ select: typeof comparisonCardSelect }>;

async function getVoteTotals(comparisonIds: string[]): Promise<Map<string, number>> {
  if (comparisonIds.length === 0) return new Map();
  const sums = await prisma.video.groupBy({
    by: ["comparisonId"],
    where: { comparisonId: { in: comparisonIds }, status: "COMPLETED" },
    _sum: { voteCount: true },
  });
  return new Map(sums.map((s) => [s.comparisonId, s._sum.voteCount ?? 0]));
}

function toCard(row: ComparisonCardRow, totals: Map<string, number>): ComparisonCardData {
  const { videos, _count, ...rest } = row;
  return {
    ...rest,
    previewVideo: videos[0] ?? null,
    modelCount: _count.videos,
    totalVotes: totals.get(row.id) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// JSON API shapes
// ---------------------------------------------------------------------------

export const apiVideoFields = {
  id: true,
  url: true,
  thumbnailUrl: true,
  duration: true,
  width: true,
  height: true,
  generationTime: true,
  cost: true,
  voteCount: true,
  createdAt: true,
} satisfies Prisma.VideoSelect;

export const apiVideoSelect = {
  ...apiVideoFields,
  model: {
    select: {
      slug: true,
      name: true,
      brand: true,
      provider: { select: { name: true, displayName: true } },
    },
  },
} satisfies Prisma.VideoSelect;

export const apiComparisonSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  prompt: true,
  isFeatured: true,
  aspectRatio: true,
  duration: true,
  createdAt: true,
  sourceImage: { select: { url: true, width: true, height: true } },
  tags: { select: { id: true, name: true, slug: true } },
  videos: {
    where: { status: "COMPLETED" },
    orderBy: { createdAt: "asc" },
    select: apiVideoSelect,
  },
} satisfies Prisma.ComparisonSelect;

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export const getHomeData = cached(async () => {
  const [latest, videos, modelCount, comparisonCount, videoCount] = await Promise.all([
    prisma.comparison.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: comparisonCardSelect,
    }),
    // Featured comparisons first, then newest, best-voted video first within each
    prisma.video.findMany({
      where: publicCompletedVideo,
      orderBy: [
        { comparison: { isFeatured: "desc" } },
        { comparison: { createdAt: "desc" } },
        { voteCount: "desc" },
      ],
      take: 24,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        voteCount: true,
        comparison: { select: { slug: true, title: true } },
        model: { select: { name: true, slug: true } },
      },
    }),
    prisma.model.count({
      where: { isActive: true, videos: { some: publicCompletedVideo } },
    }),
    prisma.comparison.count({ where: { isPublic: true } }),
    prisma.video.count({ where: publicCompletedVideo }),
  ]);

  const totals = await getVoteTotals(latest.map((c) => c.id));

  return {
    latestComparisons: latest.map((c) => toCard(c, totals)),
    videos,
    modelCount,
    comparisonCount,
    videoCount,
  };
}, "home-data");

// ---------------------------------------------------------------------------
// Comparisons list
// ---------------------------------------------------------------------------

export const COMPARISONS_PAGE_SIZE = 48;

export interface ComparisonListParams {
  type?: string;
  tag?: string;
  q?: string;
  sort?: string;
  page?: number;
}

// Arguments are part of the cache key
export const getComparisonList = cached(async (params: ComparisonListParams) => {
  const where: Prisma.ComparisonWhereInput = { isPublic: true };
  if (params.type) where.type = params.type;
  if (params.tag) where.tags = { some: { slug: params.tag } };
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { prompt: { contains: params.q, mode: "insensitive" } },
    ];
  }

  // Sort on a light row set, then load card data for the current page only
  const [rows, tags] = await Promise.all([
    prisma.comparison.findMany({
      where,
      select: { id: true, isFeatured: true, createdAt: true },
    }),
    prisma.tag.findMany({
      where: { comparisons: { some: { isPublic: true } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totals = await getVoteTotals(rows.map((r) => r.id));
  const votes = (id: string) => totals.get(id) ?? 0;

  const sort = params.sort || "votes";
  rows.sort((a, b) => {
    switch (sort) {
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "oldest":
        return a.createdAt.getTime() - b.createdAt.getTime();
      default: // "votes": featured first, then most voted
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return votes(b.id) - votes(a.id);
    }
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / COMPARISONS_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page || 1), pageCount);
  const pageIds = rows
    .slice((page - 1) * COMPARISONS_PAGE_SIZE, page * COMPARISONS_PAGE_SIZE)
    .map((r) => r.id);

  const cardRows = await prisma.comparison.findMany({
    where: { id: { in: pageIds } },
    select: comparisonCardSelect,
  });
  const byId = new Map(cardRows.map((c) => [c.id, c]));
  const comparisons = pageIds
    .map((id) => byId.get(id))
    .filter((c): c is ComparisonCardRow => !!c)
    .map((c) => toCard(c, totals));

  return { comparisons, tags, total, page, pageCount, sort };
}, "comparison-list");

// ---------------------------------------------------------------------------
// Comparison detail (cache() dedupes generateMetadata + page within a request)
// ---------------------------------------------------------------------------

export const getPublicComparison = cache((slug: string) =>
  cached(loadPublicComparison, "public-comparison", [comparisonTag(slug)])(slug)
);

async function loadPublicComparison(slug: string) {
  const comparison = await prisma.comparison.findFirst({
    where: { slug, isPublic: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      prompt: true,
      isFeatured: true,
      sourceImage: { select: { url: true, width: true, height: true } },
      tags: { select: { id: true, name: true, slug: true } },
      videos: {
        where: { status: "COMPLETED" },
        orderBy: { voteCount: "desc" },
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          generationTime: true,
          duration: true,
          width: true,
          height: true,
          cost: true,
          voteCount: true,
          createdAt: true,
          model: {
            select: {
              slug: true,
              name: true,
              provider: { select: { displayName: true } },
            },
          },
        },
      },
    },
  });

  if (!comparison) return null;

  return {
    ...comparison,
    videos: comparison.videos.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
  };
}

// ---------------------------------------------------------------------------
// Model detail
// ---------------------------------------------------------------------------

export const getPublicModel = cache((slug: string) =>
  cached(loadPublicModel, "public-model", [modelTag(slug)])(slug)
);

async function loadPublicModel(slug: string) {
  const model = await prisma.model.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      provider: { select: { displayName: true } },
      capabilities: { select: { id: true, name: true } },
    },
  });
  if (!model) return null;

  const where = { ...publicCompletedVideo, modelId: model.id } satisfies Prisma.VideoWhereInput;

  const [videos, stats, costStats] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        generationTime: true,
        duration: true,
        width: true,
        height: true,
        cost: true,
        voteCount: true,
        comparison: {
          select: { slug: true, title: true, description: true, prompt: true },
        },
      },
    }),
    // _avg ignores nulls, so manual uploads without timing don't drag averages down
    prisma.video.aggregate({
      where,
      _count: { _all: true },
      _avg: { generationTime: true, duration: true },
    }),
    // A cost of 0 means "unknown pricing", same filter as analytics and comparison pages
    prisma.video.aggregate({
      where: { ...where, cost: { gt: 0 } },
      _avg: { cost: true },
    }),
  ]);

  // Deactivated models stay visible while public comparisons still show them
  if (!model.isActive && stats._count._all === 0) return null;

  return {
    ...model,
    videos,
    videoCount: stats._count._all,
    avgGenerationTime: stats._avg.generationTime,
    avgDuration: stats._avg.duration,
    avgCost: costStats._avg.cost,
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const getModelPerformance = cached(async () => {
  const publicVideo = {
    comparison: { isPublic: true },
    model: { isActive: true },
  } satisfies Prisma.VideoWhereInput;

  const [models, statusCounts, completedStats, costStats] = await Promise.all([
    prisma.model.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.video.groupBy({
      by: ["modelId", "status"],
      where: publicVideo,
      _count: { _all: true },
    }),
    prisma.video.groupBy({
      by: ["modelId"],
      where: { ...publicVideo, status: "COMPLETED" },
      _avg: { generationTime: true, duration: true },
      _sum: { voteCount: true },
    }),
    prisma.video.groupBy({
      by: ["modelId"],
      where: { ...publicVideo, status: "COMPLETED", cost: { gt: 0 } },
      _avg: { cost: true },
    }),
  ]);

  const completed = new Map(completedStats.map((s) => [s.modelId, s]));
  const costs = new Map(costStats.map((s) => [s.modelId, s._avg.cost]));

  const performanceData = models
    .map((model) => {
      const counts = statusCounts.filter((s) => s.modelId === model.id);
      const count = (status: string) =>
        counts.find((s) => s.status === status)?._count._all ?? 0;
      const stats = completed.get(model.id);
      return {
        modelName: model.name,
        avgGenerationTime: stats?._avg.generationTime ?? 0,
        avgDuration: stats?._avg.duration ?? 0,
        avgCost: costs.get(model.id) ?? 0,
        totalVideos: counts.reduce((sum, s) => sum + s._count._all, 0),
        completedVideos: count("COMPLETED"),
        failedVideos: count("FAILED"),
        totalVotes: stats?._sum.voteCount ?? 0,
      };
    })
    .filter((d) => d.totalVideos > 0);

  return { performanceData, totalModels: models.length };
}, "model-performance");
