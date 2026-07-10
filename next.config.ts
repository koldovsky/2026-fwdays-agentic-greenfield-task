import { withSentryConfig } from "@sentry/nextjs";
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
  // Node-only libraries that resolve internal assets at runtime — opt them out
  // of Server Components bundling so their routes load them via native require
  // (node_modules/next/dist/docs: serverExternalPackages).
  //   - pdf-parse / mammoth: CV extraction (add-upload-cv, TC-PARSE-01/02).
  //   - @react-pdf/renderer: PDF export (add-resume-wizard §4, FR-EXPORT-02) —
  //     pulls in yoga-layout (wasm) + fontkit, which must not go through the
  //     webpack transform.
  //   - docx: DOCX export (FR-EXPORT-03).
  serverExternalPackages: ["pdf-parse", "mammoth", "@react-pdf/renderer", "docx"],
  // The PDF route reads the bundled PT Sans TTFs from /public at runtime via
  // fs; force-include them in that route's serverless trace so they ship with
  // the function on Vercel (they are otherwise CDN-only static assets).
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./public/fonts/ptsans/**"],
    // The cover-letter export embeds the same Cyrillic PT Sans (§4).
    "/api/export/cover-letter": ["./public/fonts/ptsans/**"],
    // The GDPR account data export now renders a PT Sans PDF (NFR-GDPR-01,
    // 2026-07-09: PDF replaces JSON). Mirrors the two entries above.
    "/api/account/export": ["./public/fonts/ptsans/**"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "tbct-69",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
