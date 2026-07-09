// Canonical site metadata — single source for SEO surfaces (metadata, robots,
// sitemap, JSON-LD). Framework-free (TC-PURE-01): no next/* imports.
// Override the origin per environment via NEXT_PUBLIC_SITE_URL.

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vouch.app";

/** Absolute site origin without a trailing slash. */
export const siteUrl = rawUrl.replace(/\/$/, "");

export const siteName = "Vouch";

/** Short positioning line reused as the default meta description. */
export const siteDescription =
  "Vouch tailors your resume to each job and grounds every line in your real " +
  "experience. Requirement-by-requirement checklist; anything it can't back " +
  "from your CV is flagged, not slipped in.";

/** Keywords for the marketing landing (BC-PRIVACY-01: no trackers, plain SEO). */
export const siteKeywords: readonly string[] = [
  "honest resume tailor",
  "resume tailoring",
  "CV tailoring",
  "grounded resume rewrite",
  "job application",
  "resume checklist",
  "overclaim detection",
];

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
