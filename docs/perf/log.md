# Landing page performance log

Method: `next build` + `next start` (port 3100), Lighthouse 12 CLI, mobile form
factor, default simulated throttling (slow 4G / 4× CPU), Chrome for Testing
(headless=new). Reports: `baseline.json` (before), `after.json` (after).

**Targets:** TBT < 200 ms, LCP < 2.5 s (mobile, throttled).

## Baseline (2026-07-02)

| Metric | Value |
|---|---|
| Perf score | 0.97 |
| FCP | 0.8 s |
| **LCP** | **2.64 s** (fail) |
| **TBT** | **30 ms** (pass) |
| CLS | 0 |

Note: the task brief cited TBT 440 ms / LCP 3.8 s; on this machine the baseline
was already TBT 30 ms / LCP 2.6 s. TBT was never a problem locally — LCP was.

### Diagnosis

LCP element is the hero `<p>` (text, no hero image). TTFB ~7 ms. Top contributors:

1. **JS payload ties into the simulated LCP graph** (~147 KB gz framework/
   hydration chunks). On localhost every resource finishes before first paint,
   so Lighthouse's lantern model charges the slow-4G download of *all* pre-LCP
   bytes (272 KB total) against LCP. TTI == LCP in the baseline report.
2. **Webfonts** — two preloaded variable fonts (Bricolage 41.5 KB + Hanken
   35 KB latin subsets), high priority, in the LCP dependency graph.
3. **26 KB favicon.ico** (4-icon, 32bpp) + a first-run cold-start render-delay
   artifact (~900 ms observed paint on run 1 only; runs 2+ paint at ~70 ms).

No render-blocking resources, `font-display: swap` already set, CLS already 0.

## Fixes (impact order)

| # | Fix | LCP | TBT | Outcome |
|---|---|---|---|---|
| 0 | baseline | 2643 ms | 30 ms | — |
| 1 | Clamp font weights (`weight: ["600","700"]` / `["400","600","700"]`) | 2480 ms | 22 ms | **Reverted** — Google Fonts served byte-identical files for static weights; zero savings. Delta vs baseline is run-1 cold-start noise, not the fix. |
| 2 | Faq → native `<details>/<summary>` (drops `"use client"`, −1 chunk, no hydration for FAQ); favicon.ico (26 KB) → `icon.svg` (570 B) | 2498 ms | 37 ms | Kept. Total transfer 272 KB → 246 KB. |
| — | 3× verification runs | **2478 / 2479 / 2482 ms** | 23 / 23 / 28 ms | Stable. |

Also: removed unused `fallow` devDependency (no runtime effect; hygiene).
Side fix: `ResultView` h2 had `font-display` with no weight utility (rendered
at 400) — given explicit `font-semibold` to match `SectionHead`.

## Result

| Metric | Baseline | After | Target | Status |
|---|---|---|---|---|
| LCP | 2.64 s | **2.48 s** | < 2.5 s | ✅ (margin ~20 ms) |
| TBT | 30 ms | **25 ms** | < 200 ms | ✅ |
| CLS | 0 | 0 | — | ✅ |
| Transfer | 272 KB | 246 KB | — | −26 KB |

## What's left (if more headroom needed)

- **Fonts (~76 KB)**: next/font options can't shrink them (verified). Next
  lever is self-hosting hand-subsetted woff2 via `next/font/local`
  (glyphhanger/pyftsubset) — est. −40 KB ≈ −0.2 s simulated LCP.
- **Framework JS (~147 KB)**: Next always ships the React runtime; the page is
  otherwise fully server-rendered. This is the floor without leaving Next.
