import type { NextConfig } from "next";

/**
 * Phase 1 SPA — static export only (ADR-0004).
 *
 * No SSR data fetchers, no getServerSideProps, no middleware, no API routes.
 * The uvicorn process serves `frontend/out/` as StaticFiles and exposes the
 * API under `/api/v1/*` (see backend `EPUBTV_SERVE_STATIC=true`). Production
 * runs single-origin; dev runs dual (yarn dev :3000 + uvicorn :8000) per D-03.
 */
const nextConfig: NextConfig = {
  output: "export",
  // `images.unoptimized` is required for `output: "export"` to keep the build
  // happy even though we render no `<Image>` in Phase 1.
  images: { unoptimized: true },
  // Avoid trailing-slash redirects — the uvicorn StaticFiles mount serves
  // the `out/` directory tree directly and trailing slashes break sub-paths.
  trailingSlash: false,
};

export default nextConfig;
