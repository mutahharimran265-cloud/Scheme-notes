import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Keep secret-by-URL app pages (share links, dashboard, etc.) out of search
// engines; allow the public marketing + trust pages. Points crawlers at the
// sitemap so they can discover those pages.
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/project/", "/dashboard", "/teams/", "/login", "/api/", "/uploads/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
