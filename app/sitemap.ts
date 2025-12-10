import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://modelarena.ai";

  // Get all public comparisons
  const comparisons = await prisma.comparison.findMany({
    where: { isPublic: true },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get all active models with at least one public video
  const models = await prisma.model.findMany({
    where: {
      isActive: true,
      videos: {
        some: {
          status: "COMPLETED",
          comparison: { isPublic: true },
        },
      },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/comparisons`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/models`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Comparison pages
  const comparisonPages: MetadataRoute.Sitemap = comparisons.map(
    (comparison) => ({
      url: `${baseUrl}/comparisons/${comparison.slug}`,
      lastModified: comparison.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  // Model pages
  const modelPages: MetadataRoute.Sitemap = models.map((model) => ({
    url: `${baseUrl}/models/${model.slug}`,
    lastModified: model.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...comparisonPages, ...modelPages];
}
