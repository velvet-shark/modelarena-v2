import { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Social crawlers honor robots.txt; og:image points at /api/og
        allow: ["/", "/api/og"],
        disallow: ["/admin/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
