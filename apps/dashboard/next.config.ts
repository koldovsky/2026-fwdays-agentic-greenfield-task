import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Repo-root env bootstrap (runs once, at server start, before any route
// handler). Two problems this fixes, both hit live on the dashboard's HITL
// calendar calls ("Не вдалося передати рішення"):
//
//   1. Next loads `.env`/`.env.local` from the APP dir (`apps/dashboard`), not
//      the monorepo root — so the repo-root `.env` (TELEGRAM/GOOGLE creds,
//      shared with the bot) was never seen here, and `GOOGLE_APPLICATION_
//      CREDENTIALS` was unset -> CalendarAuthError.
//   2. `GOOGLE_APPLICATION_CREDENTIALS` in `.env` is a path RELATIVE to the
//      repo root (`secrets/…`). The bot runs from the repo root so it resolves
//      fine, but Next runs from `apps/dashboard`, so a relative path resolved
//      against cwd pointed at `apps/dashboard/secrets/…` (ENOENT).
//
// `repoRoot` is derived from THIS file's location (stable), never from
// `process.cwd()`. `process.loadEnvFile` does not override vars already in the
// environment (an explicit export still wins); a missing `.env` (a fresh
// clone / CI) is a no-op, never a crash.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPath = resolve(repoRoot, ".env");
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Malformed/unreadable .env must never break `next dev`/`next build`;
    // a genuinely-needed var simply stays unset and its consumer apologizes.
  }
}
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credPath !== undefined && credPath.length > 0 && !isAbsolute(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(repoRoot, credPath);
}

const nextConfig: NextConfig = {
  // `better-sqlite3` is a native module (a prebuilt `.node` binary) — Next's
  // default Server Components bundling would try to bundle it, which breaks
  // native addons. `serverExternalPackages` (stable in Next.js 16, verified
  // via `ctx7`'s `/vercel/next.js` v16.2.9 docs) excludes it so it loads via
  // plain Node `require` instead.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
