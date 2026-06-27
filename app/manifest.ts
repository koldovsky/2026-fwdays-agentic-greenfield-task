import type { MetadataRoute } from "next";

// Web app manifest enabling install to the home screen (FR-PWA-01). Colors are
// the Still Water tokens (DESIGN.md); icons live in public/brand/.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pause — break reminder",
    short_name: "Pause",
    description: "A calm reminder to step away and take a break while you work.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef1f0",
    theme_color: "#eef1f0",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
