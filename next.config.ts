import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Serwist injects a webpack config (used by the production `next build --webpack`).
  // An empty turbopack config acknowledges Turbopack for `next dev`, so Next 16
  // doesn't error about a webpack config with no turbopack config.
  turbopack: {},
};

// Serwist (@serwist/next) generates the offline service worker (TC-STACK-05).
// It is disabled in development to avoid stale-cache confusion (task 2.5) and is
// emitted only by the production webpack build (`next build --webpack`).
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
