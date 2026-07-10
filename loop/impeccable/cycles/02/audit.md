# Impeccable Audit — Cycle 02

**Target:** `src/app` (+ `src/platform/web/reader-frame`, `src/app/components/reader/`)
**Method:** `/impeccable audit` static rules (`detect.mjs`) + a live walk of the running app (:5183 app, :5174 frame, :25600 Komga) via Playwright, judged on what rendered — plus independent, off-model contrast math (WCAG relative-luminance, not taken from any code comment).
**Kyiv time:** 2026-07-10 ~04:16 EEST · Phase: IMPROVE
**Register:** product · Platform: web · Brand: "The Scriptorium" (committed parchment palette — NOT the AI-cream tell)
**Baseline:** cycle 1 = **16/20** (a11y 3, perf 3, responsive 3, theming 3, anti-patterns 4). Cycle 1 landed three fix commits (`4420d91`, `fc83c64`, `b0fef82`).

---

## Audit Health Score

| # | Dimension | Score | Δ vs c1 | Key Finding |
|---|-----------|-------|---------|-------------|
| 1 | Accessibility | 4/4 | +1 | Committed **AAA (7:1) reading bar now met on all four themes** (sepia fixed 6.89→7.22). AA fully met: visible 2px focus ring, logical tab order, correct roles, axe 0 serious/critical. Lone remaining item is sub-44px touch targets (AAA 2.5.5, P3) |
| 2 | Performance | 3/4 | 0 | Lean, zero console errors on the whole core journey — but the add-source probe **still** fires the doomed CORS fetch (`net::ERR_FAILED` + a red CORS error) on the happy path. Unchanged from c1; not a fix that regressed |
| 3 | Responsive Design | 3/4 | 0 | Structural sidebar→bottom-bar collapse, no horizontal overflow at 390px, reader chrome tracks the theme responsively. Held back by the same sub-44px touch targets across library + reader chrome |
| 4 | Theming | 4/4 | +1 | Reader **chrome now tracks all four reading themes** (dark + sepia confirmed live; all four measured AA), and the four theme colors are a **single source of truth** both origins import. Full token system, dark mode works perfectly |
| 5 | Anti-Patterns | 4/4 | 0 | No AI tells. Distinctive, committed design system executed with craft. One content weakness persists (identical placeholder covers) but it is a deferred-feature gap, not a slop reflex |
| **Total** | | **18/20** | **+2** | **Excellent (minor polish) — up from Good. a11y +1, theming +1; perf & responsive share one remaining lever each** |

---

## Cycle-1 Fix Verification — all four HELD, none regressed

A regressed fix is worth more than a new P3, so each was re-checked at the source **and** exercised live.

| # | Cycle-1 fix | Verdict | Evidence |
|---|-------------|---------|----------|
| 1 | `FixtureConnector.content()` rejects a response whose content-type isn't the expected binary type (SPA-fallback HTML bug) | **HELD** | `src/plugins/connectors/fixture/index.ts:302–314`: now checks `contentType.startsWith(format.contentType)` **and** `response.ok`, throwing a plain, actionable error surfaced through the reader's EmptyState. 4 regression tests present. Real reading (Komga) unaffected — opened *Pensées* live, rendered the real EPUB. |
| 2 | `PluginRegistry` persists `#installed` as a superset of `#enabled`; disable keeps the plugin in "Installed · N"; `CapabilityMissingModal` distinguishes never-installed from installed-but-disabled | **HELD** | `src/core/registry/index.ts`: `#installed` set, `disable()` only clears `#enabled`, `rehydrate()` migrates legacy enabled-only stores. **Verified live**: toggled PDF off on `/settings/extensions` → row stayed under **Installed · 4**, toggle remained present (`aria-checked=false`), **no** Install button, **no** bounce to Available. Toggled back on → checked, still Installed. |
| 3 | Reader chrome follows the reading theme via `data-reader-theme` + `--color-reader-chrome-*` tokens | **HELD** | `ReaderView.vue:210` stamps `:data-reader-theme`; `main.css` defines the token namespace + per-theme overrides; every reader-chrome component consumes `var(--color-reader-chrome-*)`. **Verified live**: Dark reader chrome renders dark (top bar, mat, footer, chevrons); Sepia chrome renders warm sepia — screenshots captured. |
| 4 | Reading-theme colors are a single source of truth in `src/core/model/reading-theme-colors.ts`; sepia fg `#584734`; all four themes clear AAA (7:1) for body text | **HELD** | Independently recomputed (off-model): **light 13.53 · sepia 7.22 · dark 13.67 · parchment 8.02 — all ≥7:1 AAA PASS**. Both consumers (`reader-css.ts:21` and `DisplayPanel.vue:13`) import the same `READING_THEME_COLORS` table, so the picker swatch = the rendered book text (no "swatch that lies"). |

**`cycle1_fixes_held: true`.**

---

## Anti-Patterns Verdict — PASS

**Does this look AI-generated? No — with confidence.** Unchanged from cycle 1, and the cycle-1 theming fix made it *more* coherent, not less. The warm parchment ground (`#f0eee9`) is the committed "The Scriptorium" brand, executed with craft — not the warm-neutral AI-cream default. Verified against the absolute-ban list:

- **No gradient text**, **no decorative glassmorphism**, **no hero-metric template**, **no side-stripe borders**, **no numbered section scaffolding**.
- **No uppercase-tracked eyebrow on every section** — the sidebar section labels ("Sources", "Settings") and the reader's page-corner running heads are the single sanctioned mono-uppercase use, documented as a system rule.
- **One accent color only** (Terre Verte) reserved for action/selection/focus — the "One Green Rule" holds on every screen walked. The new dark-chrome accent (`#94a682`) is the *same hue* relit for the dark surround, not a second accent.
- **Monospace strictly for machine facts** (`komga · localhost:25600`, `v2.1.0`, `433 pages`, `p. 1–2 / 522`) — consistent.
- Two serifs paired on the **size-contrast axis** (Newsreader display / Literata body) — deliberate and documented.

The one tell-adjacent weakness remains the **library grid: a wall of identical Terre-Verte placeholder rectangles** (see P2 below). It reads *near* "identical card grids" but is a content/deferred-feature gap (real covers render on the detail page and in the reader), not a design reflex, so it does not fail the dimension. Score **4/4** (unchanged).

---

## Executive Summary

- **Audit Health Score: 18/20 (Excellent — minor polish).** Up +2 from cycle 1's 16/20.
- **All four cycle-1 fixes HELD; none regressed.** The two theming fixes (chrome-follows-theme, single-source sepia AAA) moved **Theming 3→4**, and clearing the committed AAA reading bar on all four themes moved **Accessibility 3→4**.
- **Issues by severity:** P0 ×0, P1 ×0, P2 ×2, P3 ×3. The P0 (fixture) and P1 (disable=uninstall) from cycle 1 are both resolved and verified.
- The **core journey remains excellent**: connect Komga → browse real library (5 titles · 1 sources) → open *Pensées* → reader renders the real EPUB (Caravaggio "Saint Jerome") → switch theme (Light/Sepia/Dark/Parchment) with chrome tracking → typeface/text-size/Paged⇄Scroll/spacing controls → keyboard-navigable with a visible focus ring. **Zero console errors** on that entire path.
- **Top remaining issues (both pre-existing, neither a regression):**
  1. **[P2]** The add-source probe still logs `net::ERR_FAILED` + a red CORS error on every successful connect (Komga sets ACAO only on `/api/**`, the prober hits `/`). Detection still succeeds. This is the single highest-value lever — it is the only thing docking **Performance** from 4.
  2. **[P2]** The library grid is a wall of identical Terre-Verte placeholder covers (Komga entries carry no `coverColor`; the grid renders **zero `<img>`**), while the connector advertises a Thumbnails capability and the detail page fetches the real cover.
  3. **[P3]** Sub-44px touch targets persist on phone (search 256×**38**, Grid/List **40×28**, See all 43×**20**, reader Aa 46×**28**, ToC **34×34**) — the shared lever holding both a11y and responsive just short of a perfect 4.
  4. **[P3]** Two indistinguishable "Komga server" rows in the sidebar while the header reads "1 sources" — a count/rows inconsistency (arises from repeated same-server connects; no dedup or disambiguation).

---

## Detailed Findings by Severity

### [P2] Console errors on the add-source happy path (doomed CORS fetch) — UNCHANGED from cycle 1
- **Location:** the add-source prober (`/settings/sources/add` flow; probe of the server root `/`).
- **Category:** Performance / Anti-Pattern (unclean console).
- **Evidence:** Typed `http://localhost:25600` → detection succeeded (field shows **Reachable**; card shows **Komga server · connector.komga · bundled · opds v2 + rest · Adapter ready** with 5 capability pills OPDS v2 / Progress sync / Search / Page streaming / Thumbnails; the Sign-in step appears). But the console logged, verbatim, on the happy path:
  - `Access to fetch at 'http://localhost:25600/' from origin 'http://localhost:5183' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
  - `Failed to load resource: net::ERR_FAILED`
- **Impact:** Every successful connect ships a doomed request + two red errors. A clean console is part of the Performance / Anti-Patterns bar, and red errors on a success path erode the "legible machinery" trust the brand is built on. This was cycle 1's P2 #3; it was **not** among the three fixes landed, so it neither improved nor regressed.
- **Recommendation:** Probe an `/api` path that carries the CORS header, or catch and swallow the *expected* opaque failure so the success path stays silent. Detection already succeeds — only the noise needs removing.
- **Suggested command:** `/impeccable optimize` (add-source prober / connect flow)

### [P2] Library grid is a wall of identical placeholder covers — UNCHANGED from cycle 1
- **Location:** `src/app/components/RecentlyCoverCard.vue` (+ `KeepReadingCard.vue`); the grid renders `entry.coverColor ?? var(--color-primary)` and **zero `<img>`**.
- **Category:** Anti-Pattern (adjacent) / Responsive-scannability / product completeness.
- **Evidence:** Every Komga book on the library grid renders as the same solid Terre-Verte rectangle with a title overlay (Komga entries carry no `coverColor`), confirmed at both desktop and 390px. Meanwhile the **detail page and the reader show the real cover** (verified the Caravaggio "Saint Jerome" blob both places). The connector advertises a "Thumbnails" capability.
- **Impact:** The most-used browse surface has no visual differentiation between books — poor scannability, and it reads *near* the "identical card grids" tell despite being real content.
- **Recommendation:** Wire the Komga thumbnails into the grid (data is available), or at minimum derive a distinct per-book placeholder color so the shelf is scannable.
- **Suggested command:** `/impeccable polish src/app/components/RecentlyCoverCard.vue`

### [P3] Sub-44px touch targets on mobile — UNCHANGED from cycle 1, now confirmed systemic
- **Location (measured at 390px):** Library — search input (256×**38**), Grid/List toggle (**40×28** each), "See all" link (43×**20**). Reader chrome — Aa/preferences (46×**28**), Table-of-contents (**34×34**), bookmark. The library nav Edda logo (231×44) and Library back button (93×32) bracket the range.
- **Category:** Accessibility / Responsive.
- **Impact:** Below the 44×44 AAA target (WCAG 2.5.5). The 20px-tall "See all" is under 2.5.8's 24px minimum, though the inline-link exception applies. PRODUCT.md makes phone reading a first-class context, so this is real on a phone even though it does not violate WCAG **AA**. It is the shared lever keeping both a11y and responsive just short of a flawless 4.
- **Recommendation:** Pad the toggle, search control, "See all", and the reader chrome icon buttons to ≥44px tap height on touch viewports (a min-height + hit-area padding, no visual redesign needed).
- **Suggested command:** `/impeccable adapt src/app/views/LibraryBrowse.vue` (and `src/app/components/reader`)

### [P3] Duplicate, indistinguishable source rows; header count disagrees with the sidebar — NEW (largely test-state)
- **Location:** the Sources sidebar (`NavSidebar.vue`) vs the Library header count (`LibraryBrowse.vue`).
- **Category:** Anti-Pattern (invented/absent affordance) / UX correctness.
- **Evidence:** `localStorage['edda.sources']` holds **two** Komga records, both `http://localhost:25600`, with different UUIDs (`94db8b08…` and `0b2d1b47…`). The sidebar renders both as identical **"Komga server / komga · localhost:25600"** rows with no way to tell them apart, while the Library header reads **"5 titles · 1 sources"**. So the count (dedupes to 1 logical server) and the sidebar (2 raw rows) disagree.
- **Impact:** Mostly an artifact of the loop's own repeated connects (the Komga source id is a fresh UUID on every connect, per the run contract) — but it exposes that the app has **no dedup or disambiguation** when the same server is connected twice, and the count/rows inconsistency is a small "legible machinery" blemish.
- **Recommendation:** Either dedup on connect (same connector + baseUrl), or disambiguate the rows (e.g. a per-source label / connected-at) and reconcile the header count with the number of rows shown.
- **Suggested command:** `/impeccable clarify src/app/components/NavSidebar.vue` (or `adapt`)

### [P3] Reader phone footer + off-ramp micro font sizes (advisory) — minor
- **Location:** reader `contentinfo` footer at 390px; `text-[10px]` / `0.65rem` / `0.7rem` / `0.6875rem` mono micro-labels in `RecentlyCoverCard.vue`, `KeepReadingCard.vue`, `DisplayPanel.vue`, `SettingsExtensions.vue`, `CapabilityMissingModal.vue`; undocumented mat colors `#efe7d3` / `#e8dfc8` now folded into the `--color-reader-chrome-mat-*` tokens.
- **Category:** Responsive / Theming (design-system drift).
- **Evidence:** The reader footer uses `whitespace-nowrap`; at position `p. 1 / 522 · 573 min left in chapter` it renders in full with **no clipping** at 390px (cycle 1's truncation was position-dependent on a longer page string). `detect.mjs` reports 40 findings — **all advisory (28) or confined to test files / book-typography / cover `<img>` (12 warnings)**; **zero errors, zero chrome warnings**.
- **Impact:** Small, mostly-justified deviations (badge micro-type, the paper mat). The footer *could* clip at a longer position string; worth a wrap/drop-segment rule below a breakpoint.
- **Recommendation:** Add the sub-`0.75rem` mono step to the documented ramp (or round up), and let the reader footer wrap or drop the "min left" segment on narrow phones.
- **Suggested command:** `/impeccable polish src/app/components/reader`

---

## Patterns & Systemic Issues

- **One console-hygiene lever gates Performance.** The add-source `/` probe is the *only* red-error source on any success path; the entire rest of the app (library, detail, reader, theme switching, extensions toggling) runs with a clean console. Fixing this one probe both moves Performance 3→4 and firms the Anti-Patterns/"legible machinery" story.
- **One touch-target lever gates Responsive (and firms a11y).** Sub-44px controls are consistent across the library toolbar and the reader chrome — a single min-height/hit-area pass on touch viewports clears the whole class.
- **The palette-split exception introduced in cycle 1 is holding.** Chrome tone now tracks the reading theme (the sanctioned exception), while book text stays owned by readium-css inside the isolated frame — verified live in Dark and Sepia, and the token blast radius is grep-confirmable (`--color-reader-chrome-`).
- **Registry semantics are now correct at the root.** `installed()` means installed, `isEnabled()` means enabled; the three-state model removed the whole disable=uninstall class of bugs, verified live.

## Positive Findings (keep and replicate)

- **The core journey is genuinely excellent** and now *complete on theming*: Komga connect → library → detail → reader-on-real-EPUB → theme/typeface/layout/spacing switching (chrome + book both tracking) → keyboard nav, all with a clean console.
- **Accessibility is a strength:** committed **AAA reading text on all four themes** (independently recomputed: 13.53 / 7.22 / 13.67 / 8.02), global 2px Terre-Verte `:focus-visible` ring (verified on first Tab), logical DOM tab order (logo → nav → search → cards, no tabindex hacks), correct roles (`switch`, `dialog`, `progressbar`, `slider`, `group`, `aria-current`), labeled fields, axe 0 serious/critical (a11y gate 12/12).
- **Reader chrome dark/sepia variants** are a model of the palette-split-with-a-sanctioned-exception: dark chrome ink/bg 12.97:1, accent relit to 6.46:1 (was 2.57:1); sepia chrome fully warm — no bright surround at night.
- **Extensions three-state model** is honest UX: disabled-but-installed stays in the Installed list with its toggle intact; a disable never masquerades as an uninstall.
- **The Display preferences sheet** previews real colors/faces and Paged⇄Scroll is a real toggle — earned familiarity, zero invented affordances.
- **The design system is enforced** — `detect.mjs` finds only advisory drift and test-file/book-typography warnings; **no errors, no chrome warnings**.

## Gate status (deterministic, off-model)

- `test:a11y` → **12 passed**.
- `test:responsive` → **18 passed, 1 skipped**.
- `detect.mjs` over `src/app`, `src/platform/web/reader-frame`, `src/app/components/reader` → 40 findings, **all advisory or test-file/book-typography; 0 errors, 0 chrome warnings**.
- Known-red (`known-red.txt`, stale specs from an unrelated in-flight refactor: 5 chromium + 2 visual) — excluded from scoring per the run contract, not re-litigated here. The missing top-level **Search nav link** noted there is **not** judged a genuine UX defect: search is present as a contextual searchbox on the Library header (the surface it searches), which is the correct IA for a library app.

---

## Recommended Actions (priority order)

1. **[P2] `/impeccable optimize`** (add-source prober / connect flow) — probe an `/api` path that carries the CORS header, or swallow the *expected* opaque failure, so a successful connect logs **no** red errors. This is the single lever that moves **Performance 3→4** and firms Anti-Patterns.
2. **[P2] `/impeccable polish src/app/components/RecentlyCoverCard.vue`** — wire Komga thumbnails into the library grid (data is available on the detail path) or derive per-book placeholder colors, so the shelf is scannable instead of a wall of identical green blocks.
3. **[P3] `/impeccable adapt src/app/views/LibraryBrowse.vue`** (and `src/app/components/reader`) — pad the search field, Grid/List toggle, "See all", and reader chrome icon buttons to ≥44px tap height on touch viewports. Moves **Responsive** toward 4 and firms a11y; no visual redesign needed.
4. **[P3] `/impeccable clarify src/app/components/NavSidebar.vue`** — dedup on connect or disambiguate duplicate "Komga server" rows, and reconcile the "N sources" header count with the number of sidebar rows.
5. **[P3] `/impeccable polish src/app/components/reader`** — let the reader footer wrap/drop "min left" on narrow phones, and fold the sub-`0.75rem` mono micro-type into the documented ramp.

> Run these one at a time, all at once, or in any order. Re-run `/impeccable audit` after fixes to see the score move — Performance and Responsive each sit at 3 with one concrete lever to reach 4.
