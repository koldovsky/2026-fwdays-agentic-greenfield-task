import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin project root so Turbopack ignores parent lockfiles (e.g. ~/bun.lock).
    root: path.join(import.meta.dirname),
  },
  reactCompiler: true,
};

export default nextConfig;
