import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `better-sqlite3` is a native module (a prebuilt `.node` binary) — Next's
  // default Server Components bundling would try to bundle it, which breaks
  // native addons. `serverExternalPackages` (stable in Next.js 16, verified
  // via `ctx7`'s `/vercel/next.js` v16.2.9 docs) excludes it so it loads via
  // plain Node `require` instead.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
