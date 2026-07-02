import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/shared/config";

// robots.txt (SEO): index the marketing surface, keep the private workspace and
// any API route handlers out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/tailor", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
