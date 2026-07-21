import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// The public, indexable pages — submit /sitemap.xml in Google Search Console so
// Google can find them. App pages (projects, dashboard) are intentionally left
// out; they're secret-by-URL.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
