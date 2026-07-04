import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright"],
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString().slice(0, 10),
  },
  ...(isProd
    ? {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
