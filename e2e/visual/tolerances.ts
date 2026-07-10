/**
 * Per-screen Tier-1 (maket structural compare) tolerances for add-visual-polish-e2e (ch11).
 *
 * These are the AGREED, REVIEWABLE "matches the maket within tolerance" numbers (spec: visual-fidelity →
 * "Visual regression against the maket"). They are per-screen because a hand-rendered maket diverges from
 * a live render by varying amounts: dense text/cover screens diff more than chrome-only ones, and the
 * mobile makets carry a phone-device mock (status bar, bezel) the app does not paint. Each number is the
 * downscaled structural-diff ratio measured on first capture (see gate1/notes.md for the baseline table)
 * plus headroom for cross-OS antialiasing. The Tier-2 golden drift gate stays tight via the global
 * `expect.toHaveScreenshot` default in playwright.config.ts.
 *
 * METHODOLOGY: capture-helper.compareToMaket() box-downscales both the app screenshot and the maket crop
 * to a ~170px-wide thumbnail before pixelmatch (threshold 0.2). At that scale font antialiasing and the
 * browser-frame inset wash out, so the ratio reflects layout + colour fidelity, not glyph rendering.
 */

/** pixelmatch per-pixel colour threshold used for every Tier-1 compare (0 strict … 1 lax). */
export const PIXEL_THRESHOLD = 0.2

/** Thumbnail width for the structural downscale. */
export const THUMB_WIDTH = 170

// Per-screen Tier-1 maket-diff tolerances (fraction of differing thumbnail pixels). Each value is the
// MEASURED downscaled diff on first capture + headroom for cross-OS antialiasing / run-to-run variance.
// Measured baseline (Chromium/macOS, 170px thumb, pixel-threshold 0.2):
//   extensions 1.86% · readingPreferences 5.51% (Display sheet vs composite) · readerMobile 5.76% ·
//   capabilityMissing 12.18% · addSource 15.48% · bookDetailMobile 16.28% · bookDetail 17.78% ·
//   library 18.46% · reader 23.72% (chrome only — iframe masked) · libraryMobile 29.04%.
// The desktop library/book-detail residual is dominated by legitimately-different fixture content (empty
// Sources region + no Downloads badge vs the maket's populated mock); reader is chrome-only with the
// non-deterministic book iframe masked; the mobile residuals additionally include the maket's phone-device
// mock (status bar + bezel). libraryMobile is the loosest — the mobile library header (search + masked
// sync pill) differs from the maket's avatar header; see notes.md triage (a mobile library-header pass
// belongs to the library-browse change, not ch11 polish).
export const TIER1 = {
  library: 0.22,
  bookDetail: 0.22,
  reader: 0.28,
  readingPreferences: 0.1,
  addSource: 0.2,
  extensions: 0.06,
  capabilityMissing: 0.17,
  libraryMobile: 0.34,
  bookDetailMobile: 0.22,
  readerMobile: 0.12,
} as const

export type Tier1Screen = keyof typeof TIER1
