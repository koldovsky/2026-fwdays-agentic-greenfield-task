# Impeccable Audit — Cycle 03

**Target:** `src/app` (+ `src/platform/web/reader-frame`, `src/app/components/reader/`)
**Method:** `/impeccable audit` static rules (`detect.mjs`) + a live walk of the running app (:5183 app, :5174 frame, :25600 Komga) via Playwright, judged on what rendered — plus independent, off-model WCAG contrast math and a purpose-built touch-context check (`hasTouch: true`) that flips `pointer: coarse`.
**Kyiv time:** 2026-07-10 ~05:48 EEST · Phase: IMPROVE
**Register:** product · Platform: web · Brand: "The Scriptorium" (committed parchment palette — NOT the AI-cream tell)
**Baseline:** cycle 2 = **18/20** (a11y 4, perf 3, responsive 3, theming 4, anti-patterns 4). Cycle 2 landed two fixes (staged `serverProbe`; the `.tap-target` coarse-pointer utility).

---

## Audit Health Score

| # | Dimension | Score | Δ vs c2 | Key Finding |
|---|-----------|-------|---------|-------------|
| 1 | Accessibility | 4/4 | 0 | Committed **AAA (7:1) reading bar met on all four themes** (recomputed off-model). Visible **2px solid Terre-Verte focus ring** (measured `outline: 2px solid rgb(85,97,76)` on Tab). axe 0 serious/critical (12/12). **Touch targets now reach 44px on coarse pointers** — the sole AAA caveat cycle 2 flagged is resolved. |
| 2 | Performance | 4/4 | **+1** | The add-source probe **no longer fires the doomed CORS-less root fetch**. Live-verified: a successful Komga connect logs **ZERO** console errors/warnings and hits **only** `GET /api/v1/claim` + `GET /api/v1/books`. This was the single lever cycle 2 said held Perf at 3. No layout thrash, lazy plugin chunks, auth-safe `blob:` covers, global reduced-motion, no heavy blur/filter animation. |
| 3 | Responsive Design | 4/4 | **+1** | Sub-44px touch targets **fixed and gated**. Zero horizontal overflow at 390/768px. Structural sidebar→bottom-nav collapse; reader chrome tracks the theme responsively. The dedicated coarse-pointer tap-target + occlusion tests (4 of them) all pass. |
| 4 | Theming | 4/4 | 0 | Full token system; four reading themes all AAA; **reader chrome tracks all four themes** (Light/Sepia/Dark/Parchment confirmed live); reading-theme colors are a single source of truth both origins import. Dark mode is exact. |
| 5 | Anti-Patterns | 4/4 | 0 | No AI tells. Distinctive committed design executed with craft. One-green-rule holds; mono strictly for machine facts; two serifs on the size axis. `detect.mjs`: 40 findings, all advisory (28) or test-file/book-typography warnings (12) — **0 errors, 0 chrome warnings**. |
| **Total** | | **20/20** | **+2** | **Excellent. Both cycle-2 fixes HELD; no regression. Perf 3→4 and Responsive 3→4 — the two levers cycle 2 named are the two that moved.** |

---

## Cycle-2 Fix Verification — both HELD, no regression

A regressed fix outweighs any new P3, so each was re-checked at the source **and** exercised live.

### Fix 1 — staged `serverProbe` (eager first, `fallback` probes only if nothing claimed the URL) → **HELD**

- **Source:** `src/core/dispatch/server-prober.ts:184–218`. `serverProbe` splits `installed` into `eagerEntries` (non-`fallback`) and `fallbackEntries`. It sweeps eager first; the broad/fallback OPDS content-sniff of the raw pasted URL runs **only** `if (!pickBest(installedClaims, minConfidence) && fallbackEntries.length > 0)`. `plugins-catalog.ts:81` marks OPDS `fallback: true`; Komga's dedicated-endpoint probe is not. So a Komga URL is claimed eagerly and the CORS-less bare-root request never fires.
- **Live evidence (clean-state connect of `http://localhost:25600`):**
  - Probe step: field shows **Reachable**; card shows **Komga server · connector.komga · bundled · opds v2 + rest · Adapter ready** with the 5 capability pills. Console: **0 errors, 0 warnings**. Only `:25600` request: **`GET /api/v1/claim => 200`** — no bare `/`, no `net::ERR_FAILED`, no CORS error.
  - After Connect (library loads): whole-session console **0 errors / 0 warnings**; `:25600` requests are exactly **`GET /api/v1/claim`** + **`GET /api/v1/books?size=200&page=0`**, both 200.
- **Detection edge cases still correct:** `server-prober.test.ts` + `server-prober.integration.test.ts` + `plugins-catalog.test.ts` = **28 passed** — bare OPDS feed still detected via the fallback sniff, and an unreachable host still resolves `unreachable` (reject propagates, never swallowed to `null`).

### Fix 2 — `.tap-target::after` under `@media (pointer: coarse)` grows 13 controls to ≥44px, zero desktop change → **HELD**

- **Source:** `src/app/styles/main.css:216–232`. `.tap-target { position: relative }`; under `@media (pointer: coarse)` a content-`''` `::after` is `position:absolute`, centered, `width/height: max(44px, 100%)`. 19 `.tap-target` usages across BaseButton, BaseToggle, SegmentedControl, SidebarLink, reader chrome, book-detail header, add-source, capability modal.
- **Live evidence (dedicated `hasTouch: true` context — confirmed `pointer:coarse` and `any-pointer:coarse` both `true`):**
  - Effective tap heights measured (own box → `::after`): "See all" 20→**44**, Grid 28→**44**, List 28→**44**, "Enable" buttons 24→**44**, Install 40→**44**, "Add source" 40→**44**. All ≥44px.
  - **Desktop inert:** the responsive gate confirms `getComputedStyle(Grid,'::after').content === 'none'` on the fine-pointer project — no golden/responsive snapshot can move.
  - **Occlusion guard clean:** with the gate's exact fold-aware logic (`elementFromPoint(centre)` must equal the control or a descendant), **zero** violations at **both 390×844 and 412×900** on `/library` and `/settings/extensions`. (A first, non-fold-aware pass flagged Grid/List — traced to a sub-pixel `Math.round` pushing the centre onto the BottomNav's top edge; a false positive, not a real occlusion.)
- **Gated:** `e2e/responsive/viewport-checks.spec.ts` now carries 4 dedicated tests — library tap targets, reader-chrome tap targets, fine-pointer inertness, and the 3-route occlusion guard — **all passing**.

**`cycle2_fixes_held: true`.**

---

## Anti-Patterns Verdict — PASS

**Does this look AI-generated? No — with confidence.** The warm parchment ground (`#f0eee9`) is the committed "The Scriptorium" brand, executed with craft, not the warm-neutral AI-cream default. Verified live against the absolute-ban list:

- **No gradient text, no decorative glassmorphism, no hero-metric template, no side-stripe borders, no numbered scaffolding.**
- **No uppercase-tracked eyebrow on every section** — the sole sanctioned mono-uppercase use is the sidebar section labels ("SOURCES"/"SETTINGS") and the reader running heads, a documented system rule.
- **One accent color only** (Terre Verte) for action/selection/focus; the dark-chrome accent is the same hue relit, not a second accent.
- **Monospace strictly for machine facts** (`komga · localhost:25600`, `connector.komga · v2.1.0`, `433 pages`, `p. 1–2 / 522`).
- Two serifs paired on the **size-contrast axis** (Newsreader display / Literata body), documented.

The one tell-adjacent weakness is the **library grid: a wall of identical Terre-Verte placeholder covers** (P2 below) — but it reads *near* "identical card grids" as a content/deferred-feature gap (real covers render on the detail page and reader; each tile carries a distinct title), not a slop reflex. Does not fail the dimension. **Score 4/4.**

---

## Executive Summary

- **Audit Health Score: 20/20 (Excellent).** Up +2 from cycle 2's 18/20.
- **Both cycle-2 fixes HELD; no regression.** Staging the prober cleared the last red-console source on the happy path (**Performance 3→4**), and the coarse-pointer tap-target utility cleared the sub-44px class across library + reader chrome (**Responsive 3→4**). a11y, Theming, and Anti-Patterns each stay at a solid 4.
- **Issues by severity:** P0 ×0, P1 ×0, P2 ×1, P3 ×3 — all polish; none docks a dimension.
- **Core journey is excellent and clean:** connect Komga → browse real library (5 titles · 1 sources) → open *Pensées* → reader renders the real EPUB (Caravaggio "Saint Jerome") → switch theme (chrome tracks all four) → typeface/size/Paged⇄Scroll/spacing → keyboard-navigable with a visible focus ring. **Zero console errors** end to end.
- **Gates (deterministic, off-model):** typecheck clean · unit **691 passed** (69 files) · a11y **12 passed** · responsive **24 passed, 1 skipped** · prober edge cases **28 passed** · chromium failures **⊆ known-red** (the same 5 stale specs, no new failure).

### Why each dimension is a genuine 4 (not inflation)

- **Accessibility 4** — Committed bar is AA chrome + **AAA (7:1) reading text**. All four reading themes clear AAA (recomputed: light 13.53, sepia 7.22, dark 13.67, parchment 8.02). Visible 2px Terre-Verte focus ring measured on Tab; correct roles (`dialog`/`switch`/`progressbar`/`slider`/`group`/`searchbox`/landmarks); focus-trap + Escape in modals (gated); axe 0 serious/critical. The lone cycle-2 caveat (sub-44px touch) is now resolved on coarse pointers. The add-source URL input at 42px misses AAA by 2px but meets **AA** (chrome's committed bar) — known & accepted, not re-raised.
- **Performance 4** — Cycle 2 explicitly said the doomed probe fetch was "the only thing docking Performance from 4." It is fixed and live-verified silent. No layout thrash; lazy plugin `import()` chunks; auth-protected covers served as same-origin `blob:` (no 401 storm, no native credential popup); global `prefers-reduced-motion` reset; no unbounded blur/filter/`will-change` animation found.
- **Responsive 4** — Cycle 2 said sub-44px was "the shared lever keeping both a11y and responsive just short of a flawless 4." Fixed + gated. Zero horizontal overflow at 390 and 768px (measured `scrollWidth === clientWidth`). Structural collapse to a 3-tab BottomNav; reader chrome responsive per theme; occlusion guard clean at phone width.
- **Theming 4** — Full `@theme` token system; four reading themes all AAA; chrome-follows-theme verified live in all four; reading-theme colors single-sourced in `src/core/model/reading-theme-colors.ts` (swatch = rendered book text). Dark mode exact.
- **Anti-Patterns 4** — See verdict above; `detect.mjs` finds 0 errors and 0 chrome warnings, only advisory micro-type drift and test/book-typography noise.

---

## Detailed Findings by Severity

### [P2] Library grid is a wall of identical placeholder covers — UNCHANGED from cycle 2
- **Location:** `src/app/components/RecentlyCoverCard.vue` (+ `KeepReadingCard.vue`); the grid renders `entry.coverColor ?? var(--color-primary)` and **zero `<img>`** for Komga entries.
- **Category:** Anti-Pattern (adjacent) / scannability / product completeness.
- **Impact:** Every Komga book renders as the same solid Terre-Verte tile with a title overlay (confirmed desktop + 390px). The **detail page and reader show the real cover** (Caravaggio blob verified both places) and the connector advertises a **Thumbnails** capability — so the data exists but the most-used browse surface has no visual differentiation. Reads *near* the "identical card grids" tell despite being real content.
- **Recommendation:** Wire Komga thumbnails into the grid (data is available on the detail path), or at minimum derive a distinct per-book placeholder color so the shelf is scannable. This is the single highest-value remaining improvement.
- **Suggested command:** `/impeccable polish src/app/components/RecentlyCoverCard.vue`

### [P3] Reader footer could clip on a longer position string — minor, position-dependent
- **Location:** reader `contentinfo` footer (`ReaderPositionBar` / `ReaderView` footer) at 390px.
- **Category:** Responsive.
- **Impact:** The footer uses `whitespace-nowrap`; at `p. 1–2 / 522 · 573 min left in chapter` it renders in full with **no clipping** at 390px (verified live). A longer chapter/position string could still overflow the fixed footer.
- **Recommendation:** Let the footer wrap or drop the "min left" segment below a narrow breakpoint.
- **Suggested command:** `/impeccable polish src/app/components/reader`

### [P3] Sub-`0.75rem` mono micro-type is off the documented type ramp — design-system drift
- **Location:** 23 `detect.mjs` advisory hits — `10px`/`0.625rem`/`0.65rem`/`0.6875rem`/`0.7rem` in `RecentlyCoverCard.vue`, `KeepReadingCard.vue`, `CapabilityMissingModal.vue`, `reader/DisplayPanel.vue`, `reader/ReaderSpread.vue`, `reader/ReaderTopBar.vue`.
- **Category:** Theming (design-system drift).
- **Impact:** Small, mostly-justified badge/running-head micro-type, but off DESIGN.md's ramp. Advisory only — no error.
- **Recommendation:** Add the sub-`0.75rem` mono step to the documented ramp (or round up to an existing step).
- **Suggested command:** `/impeccable typeset src/app/components`

### [P3] No top-level "Search" nav item — advisory (arguably correct IA)
- **Location:** primary nav (`NavSidebar.vue` / `BottomNav.vue`).
- **Category:** UX / IA. (Noted per the run contract's allowance; do not confuse with the stale known-red "Home nav link" spec.)
- **Impact:** There is no global Search destination; search is a contextual searchbox on the Library header (the surface it searches). For a single-library reader this is defensible IA, so this is advisory, not a defect.
- **Recommendation:** Leave as-is unless a cross-source search destination is added later.
- **Suggested command:** none (advisory).

> **Not re-raised (known & accepted per run contract):** the add-source URL input is 42px (meets AA, misses the 44px AAA bar by 2px), deliberately left to avoid churning the add-source goldens. Also the duplicate-source-row artifact from repeated loop connects (I cleared 4 stale Komga records from `localStorage` before this audit for a clean single-source state) — a test-state artifact, not a product defect on a single connect.

---

## Patterns & Systemic Issues

- **The two levers cycle 2 identified are gone.** Cycle 2 said console-hygiene gated Performance and touch-targets gated Responsive (+ firmed a11y). Both were fixed this cycle at the architectural level (prober staging; a single reusable `.tap-target` utility) rather than patched per-call — and both are now guarded by dedicated, passing gate tests, so they can't silently regress.
- **The palette-split exception continues to hold.** Chrome tone tracks the reading theme (sanctioned exception) while book text stays owned by readium-css inside the isolated frame — verified live in all four themes; the token blast radius is grep-confirmable (`--color-reader-chrome-`).
- **Remaining surface is content/polish, not architecture.** The one P2 (library covers) is a deferred-feature gap; the P3s are micro-type ramp drift and a position-dependent footer wrap.

## Positive Findings (keep and replicate)

- **The core journey is genuinely excellent and clean** — Komga connect → library → detail → reader-on-real-EPUB → theme/typeface/layout/spacing switching (chrome + book both tracking) → keyboard nav, with a **0-error / 0-warning** console throughout.
- **Accessibility is a strength:** AAA reading text on all four themes, a global 2px Terre-Verte `:focus-visible` ring (measured), logical tab order, correct roles, labeled fields, axe clean, focus-trapped modals.
- **The Display preferences sheet** previews real theme colors and typefaces and Paged⇄Scroll is a real toggle — earned familiarity, zero invented affordances.
- **The Downloads empty state teaches the interface** ("Download a book from its detail page to read it offline. It will appear here and bypass the network entirely.") rather than saying "nothing here."
- **Extensions three-state model** is honest UX: bundled rows locked, PDF toggle live, a disable never masquerades as an uninstall.
- **The design system is enforced** — `detect.mjs` finds only advisory drift and test/book-typography warnings; no errors, no chrome warnings.

## Gate status (deterministic, off-model)

- `typecheck` → clean (`vue-tsc --noEmit`, exit 0).
- `test` (unit) → **691 passed** (69 files).
- `test:a11y` → **12 passed**.
- `test:responsive` → **24 passed, 1 skipped** (includes the 4 dedicated tap-target/occlusion tests).
- prober edge cases (`server-prober` + integration + `plugins-catalog`) → **28 passed**.
- `detect.mjs` over the three targets → 40 findings, **all advisory or test/book-typography; 0 errors, 0 chrome warnings**.
- `chromium` project → **5 failed, 24 passed**; the 5 failures are **exactly** the known-red set (3 app-shell + 2 extensions-capability specs) — **failures ⊆ known-red.txt, no new failure**. (Plus the 2 known-red visual specs, excluded per contract.)

---

## Recommended Actions (priority order)

1. **[P2] `/impeccable polish src/app/components/RecentlyCoverCard.vue`** — wire Komga thumbnails into the library grid (data is available on the detail path) or derive per-book placeholder colors, so the shelf is scannable instead of a wall of identical green tiles. The single highest-value remaining improvement.
2. **[P3] `/impeccable polish src/app/components/reader`** — let the reader footer wrap or drop "min left" on narrow phones so a longer position string can't clip.
3. **[P3] `/impeccable typeset src/app/components`** — fold the sub-`0.75rem` mono micro-type (23 advisory hits) into the documented DESIGN.md ramp, or round up.

> The design is at 20/20 with all gates green and no regression. These are polish steps; run them one at a time and re-run `/impeccable audit` to confirm the score holds. Per the run contract, one 20/20 does not stop the loop — stop early only on 20/20 twice in a row.
