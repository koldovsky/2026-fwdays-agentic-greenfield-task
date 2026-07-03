import type { NextConfig } from "next";

// Security response headers on every route (add-security-hardening,
// NFR-SEC-03). CSP notes:
// - `next/font` self-hosts both Google fonts at build time, so fonts load from
//   'self' — no fonts.googleapis.com / fonts.gstatic.com entries needed.
// - style-src 'unsafe-inline': Next injects inline <style> tags for the
//   Tailwind v4 stylesheet and font CSS during streaming render.
// - script-src 'unsafe-inline': the statically prerendered pages bootstrap
//   hydration with inline scripts; a nonce would force every page dynamic and
//   break the landing's NFR-PERF-04 budget (design.md).
// - 'unsafe-eval' + ws: are dev-only (React's enhanced debugging, HMR socket);
//   production stays strict.
// - No third-party hosts at all — BC-PRIVACY-01 forbids trackers, so there is
//   nothing else to allow.
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // CV extraction libraries (add-upload-cv, TC-PARSE-01/02) are Node-only and
  // resolve internal assets at runtime — opt them out of Server Components
  // bundling so the /api/cv/parse route loads them via native require
  // (node_modules/next/dist/docs: serverExternalPackages).
  serverExternalPackages: ["pdf-parse", "mammoth"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
