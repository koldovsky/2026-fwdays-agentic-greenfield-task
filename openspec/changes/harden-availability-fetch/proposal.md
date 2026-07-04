# Proposal: Harden MHOA availability fetch

## Problem

On STG, `/book` When step shows raw Playwright timeout errors and 502s after ~2 minutes. Users cannot recover without a full reload.

Root causes:

1. **Prefetch storm** — wizard prefetches all 7 bookable dates sequentially; each live scrape holds the Playwright lock ~15–30s on a small droplet, starving the user's active date request until nginx times out (120s).
2. **Error caching** — failed availability responses are cached client-side; stale errors persist after fixes or retries.
3. **Raw errors in UI** — Playwright locator dumps are shown to residents.
4. **Redundant scraping** — each court re-navigates the MHOA calendar independently.

## Solution

- Prefetch **only tomorrow** (first bookable date), not all 7 days
- Scrape **both courts in one calendar navigation** per date
- **Do not cache** error responses; add **Retry** on the availability panel
- Map scraper failures to **friendly messages** (timeout, calendar, MHOA down)
- Server-side **90s budget** per availability request with clear failure before nginx cutoff

## PRD

- **FR-AVAIL-04** — Availability errors are user-friendly with retry; no stale error cache
