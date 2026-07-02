import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/shared/config";

// sitemap.xml (SEO). Only the public landing is listed today; the tailor
// workspace is intentionally excluded (disallowed in robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
