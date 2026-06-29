import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from LAN origins (e.g. http://192.168.x.x:3000).
  // Without this, Next treats non-localhost dev requests as cross-origin and blocks
  // the client JS / HMR, so the page never hydrates and onClick handlers (e.g. the
  // highlighter color picker) do nothing. Add your machine's LAN IP here if it differs.
  allowedDevOrigins: ['192.168.0.204', '192.168.1.204', '*.local'],
};

export default nextConfig;
