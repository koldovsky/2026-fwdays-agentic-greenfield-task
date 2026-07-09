import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/shared/config";

// sitemap.xml (SEO). Public marketing + legal pages; the tailor workspace is
// intentionally excluded (disallowed in robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/oferta"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
