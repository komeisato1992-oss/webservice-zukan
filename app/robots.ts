import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const host = new URL(siteUrl).host;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/auth",
          "/auth/",
          "/api",
          "/api/",
          "/login",
          "/preview",
          "/preview/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
