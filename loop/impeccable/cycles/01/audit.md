# Impeccable Audit — Cycle 01

**Target:** `src/app` (+ `src/platform/web/reader-frame`, `src/app/components/reader/`)
**Method:** `/impeccable audit` static rules (`detect.mjs`) + live walk of the running app (:5183 app, :5174 frame, :25600 Komga) via Playwright, judged on what rendered — not what the source implies.
**Kyiv time:** 2026-07-10 ~02:40 EEST · Phase: IMPROVE
**Register:** product · Platform: web · Brand: "The Scriptorium" (committed parchment palette — NOT the AI-cream tell)

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | AA fully met (focus rings, ARIA, keyboard), but committed AAA reading bar missed by `sepia` (6.89:1) + sub-44px touch targets on mobile |
| 2 | Performance | 3/4 | Lean + clean console on the core journey, but the add-source probe fires a doomed CORS fetch (`net::ERR_FAILED`) on the happy path |
| 3 | Responsive Design | 3/4 | Structural sidebar→bottom-bar collapse, no horizontal overflow at 390px; reader footer metadata truncates on phone, small tap targets |
| 4 | Theming | 3/4 | Full token system + 4 working reading themes, but reader **chrome** ignores the Dark theme (bright surround) and the 4 theme colors are duplicated across two files |
| 5 | Anti-Patterns | 4/4 | No AI tells. Distinctive, intentional, committed design system. One content weakness (identical placeholder covers) but not a slop reflex |
| **Total** | | **16/20** | **Good — address the weak dimensions (a11y / perf / responsive / theming all sit at 3)** |

---

## Anti-Patterns Verdict — PASS

**Does this look AI-generated? No — with confidence.** This is one of the more distinctive, deliberately-crafted product design systems you would audit. The warm parchment ground (`#f0eee9`) is the project's **committed brand** ("The Scriptorium", DESIGN.md: iron-gall ink on vellum), executed with real craft — not the warm-neutral AI-cream default. Verified against the absolute-ban list:

- **No gradient text**, **no decorative glassmorphism**, **no hero-metric template**, **no side-stripe borders.**
- **No uppercase-tracked eyebrow on every section** — the sidebar section labels ("Sources", "Settings") are the single sanctioned mono-uppercase use, documented as a system rule.
- **One accent color only** (Terre Verte) reserved for action/selection/focus — the "One Green Rule" holds on every screen walked.
- **Monospace strictly for machine facts** (`komga · localhost:25600`, `v2.1.0`, `433 pages`, `1.2 MB`) — the "legible machinery" principle is real and consistent.
- Two serifs paired on the **size-contrast axis** (Newsreader display / Literata body) — deliberate and documented, not the "two similar sans" pairing hazard.

The one tell-adjacent weakness is the **library grid: a wall of identical Terre-Verte placeholder rectangles** (see P2 below). That reads *near* the "identical card grids" pattern, but it is a deferred-feature/content gap (real thumbnails exist and render on the detail page), not a design reflex — so it does not fail the dimension. Score **4/4**.

---

## Executive Summary

- **Audit Health Score: 16/20 (Good).**
- **Issues by severity:** P0 ×1, P1 ×1, P2 ×5, P3 ×3.
- The **primary user journey is flawless**: connect Komga → browse real library → open *Pensées* → it reopens at the stored position (`p. 349–350 / 522`, 67%) → switch themes/typeface → toggle Paged⇄Scroll → turn pages. Zero console errors on that path. Real Caravaggio cover on the detail page. This is a genuinely good app.
- **Top issues:**
  1. **[P0]** The **fixture** source can never open a book — `content()` trusts `response.ok`, the missing `public/fixtures/` dir makes Vite's SPA fallback return `index.html` (HTTP 200), and the reader dies on *"End of central directory not found."* Demo data that pretends to work.
  2. **[P1]** On Extensions, **disabling a plugin reads as uninstalling it** — toggling PDF off drops it from "Installed · 3" back to "Available" with an **Install** button and the pre-install size, and the toggle vanishes under the cursor.
  3. **[P2]** The add-source probe fetches Komga's `/` (no CORS header there) → a red **CORS error + `net::ERR_FAILED`** logged on every successful connect, even though detection succeeds.
  4. **[P2]** The **reader chrome/mat ignores the Dark reading theme** — the page goes dark but the surrounding top bar, bottom bar, and the wide book "mat" stay bright parchment, defeating night reading.
  5. **[P2]** `sepia` reading text is **6.89:1** — below the project's own committed **AAA (7:1)** bar for reading text; the fix is blocked behind a color value duplicated across two files.
- **Recommended next steps:** harden the fixture connector (P0), clarify the disable/uninstall model (P1), then polish the theming and console-hygiene items. Full command list at the end.

---

## Detailed Findings by Severity

### [P0] Fixture source can never open a book — reader dies on SPA-fallback HTML
- **Location:** `src/plugins/connectors/fixture/index.ts:287` (`content()`), lines 290–294.
- **Category:** Performance / Anti-Pattern (product honesty) / robustness.
- **Evidence:** `content()` does `fetch('/fixtures/<bookId>.<ext>')`. Confirmed `public/fixtures/` **does not exist** (`public/` holds only `favicon.svg` + `icons/`). Vite answers the missing path with `index.html` at HTTP 200, so `response.ok` is `true`, the reader receives HTML, and foliate-js throws *"End of central directory not found."*
- **Impact:** Any book opened from the in-memory fixture/maket seed fails to render. Real reading (Komga) is unaffected and works perfectly — but shipping a demo source that silently pretends to work violates "Offline is a fact reported calmly," and the failure surfaces as an opaque zip error, not an honest message.
- **Recommendation:** Two halves. (1) Make `content()` **fail loudly** — reject a response whose `content-type` is not the expected binary EPUB/PDF type instead of trusting `response.ok`. (2) Give the fixture real bytes, or make an unopenable fixture book **honest in the UI** (disabled "Continue reading" + a plain reason). Do not ship demo data that pretends to work.
- **Suggested command:** `/impeccable harden src/plugins/connectors/fixture/index.ts`

### [P1] "Disable" silently means "uninstall" on the Extensions screen
- **Location:** `src/core/registry/index.ts:164` (`installed()` returns *enabled*; `available()` at :169 returns *not-enabled*); surfaced by `src/app/views/SettingsExtensions.vue`.
- **Category:** Accessibility / UX correctness / Anti-Pattern (invented affordance semantics).
- **Evidence:** Walked live — installed PDF (→ "Installed · 4", toggle on), then toggled it **off**. The row immediately moved out of "Installed · 3" and back under **Available** rendered as *"Next up · format.pdf · 1.2 MB"* with an **Install** button. The switch the user just clicked disappears from under the cursor.
- **Impact:** A reversible "disable" is presented as a destructive "uninstall." The user loses the control they were operating and cannot tell disabled-but-installed from never-installed. Directly contradicts Design Principle 2 ("a capability the app lacks is *named*, not silently degraded") and the "earned familiarity" principle — a toggle must not delete itself.
- **Recommendation:** Decide the intended model (installed+disabled is a real, distinct state) and make the UI say it: keep a disabled-but-installed plugin **in the Installed list** with its toggle off, and reserve "Available / Install" for plugins that were never installed. `installed()` should mean *installed*, not *enabled*.
- **Suggested command:** `/impeccable clarify src/app/views/SettingsExtensions.vue`

### [P2] Console errors on the add-source happy path (doomed CORS fetch)
- **Location:** the add-source prober (`/settings/sources/add` flow; probe of the server root).
- **Category:** Performance / Anti-Pattern (unclean console).
- **Evidence:** Typed `http://localhost:25600` → detection succeeded ("Reachable", "Adapter ready", 5 capability pills), but the console logged, on the happy path:
  - `Access to fetch at 'http://localhost:25600/' from origin 'http://localhost:5183' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header...`
  - `Failed to load resource: net::ERR_FAILED`
  Komga only sets ACAO on `/api/**`, not on `/`.
- **Impact:** Every successful connect ships a doomed request + two red errors. A clean console is part of the Performance / Anti-Patterns bar, and red errors on a success path erode the "legible machinery" trust the brand is built on (an operator watching the console sees a failure that isn't one).
- **Recommendation:** Probe an `/api` path that carries the CORS header, or catch and swallow the *expected* opaque failure so the success path stays silent. Detection already succeeds — only the noise needs removing.
- **Suggested command:** `/impeccable optimize` (add-source prober / connect flow)

### [P2] Reader chrome ignores the Dark reading theme — bright surround at night
- **Location:** `src/app/components/reader/` (top bar `ReaderTopBar.vue`, footer, spread mat `ReaderSpread.vue`) vs `src/platform/web/reader-frame/reader-css.ts`.
- **Category:** Theming / UX.
- **Evidence:** Set the reading theme to **Dark**: the two page columns render dark (`#1b1714` / `#e7e1d4`, ~13.6:1 — excellent), but the reader top bar, the position slider footer, and the wide parchment "mat" around the pages **stay bright `#f0eee9`**. Roughly three-quarters of the screen is bright in "Dark" mode.
- **Impact:** Defeats the purpose of a dark reading theme (low light emission for night/commute reading — a named user context). The bright frame around a dark page is visually jarring and is the opposite of what Kindle/Kobo/Apple Books do. This is spec-*consistent* (the "Two Palettes Rule" keeps book colors and chrome colors separate), so the fix must stay on the **app-chrome** side — give the reader chrome a dark variant that tracks the reading theme. **Do not restyle book text** (that is readium-css and out of scope).
- **Recommendation:** When the active reading theme is `dark`, switch the reader chrome (top/bottom bars + mat) to a dark chrome variant. Keep the palette split intact; this is a chrome-token change, not a book-content change.
- **Suggested command:** `/impeccable polish src/app/components/reader`

### [P2] `sepia` reading text misses the committed AAA bar, and the fix is duplicated across two files
- **Location:** `src/platform/web/reader-frame/reader-css.ts:25` (`sepia: { bg: '#f1e7d0', fg: '#5b4a36' }`) **and** `src/app/components/reader/DisplayPanel.vue:29` (same values).
- **Category:** Accessibility / Theming.
- **Evidence:** DESIGN.md + PRODUCT.md both commit to **AAA (7:1) for reading text**; measured `sepia` body contrast is **6.89:1** — a fail. Confirmed the four theme colors are declared **twice** (reader-css THEME_COLORS + the DisplayPanel swatches), so a one-file patch would leave the picker previewing a color the reader no longer uses.
- **Impact:** One of four reading themes misses the app's own stated accessibility bar for its core task. The duplication is itself a "swatch that disagrees with the CSS it previews is a lie" (a documented DON'T).
- **Recommendation:** Extract the four theme colors to one shared constant, then bump `sepia` foreground `#5b4a36 → #584734` (7.22:1, negligible warmth cost — the exact fix DESIGN.md prescribes).
- **Suggested command:** `/impeccable polish src/platform/web/reader-frame/reader-css.ts` (extract shared THEME_COLORS + fix sepia)

### [P2] Library grid is a wall of identical placeholder covers
- **Location:** `src/app/components/RecentlyCoverCard.vue` (+ `KeepReadingCard.vue`); the library grid uses `entry.coverColor ?? var(--color-primary)` and renders **zero `<img>`** (verified: `imgCount: 0` on `/library`).
- **Category:** Anti-Pattern (adjacent) / Responsive-scannability / product completeness.
- **Evidence:** Every Komga book on the library grid renders as the same solid Terre-Verte rectangle with a title overlay (Komga entries carry no `coverColor`). Meanwhile the **detail page fetches and shows the real cover** (verified blob image, 200×300, the Caravaggio "Saint Jerome"). The connector advertises a "Thumbnails" capability. The card comment marks this a deliberate placeholder "until real thumbnails arrive."
- **Impact:** The app's most-used browse surface has no visual differentiation between books — poor scannability, and it reads *near* the "identical card grids" tell despite being real content.
- **Recommendation:** Wire the Komga thumbnails into the grid (data is available), or at minimum derive a distinct per-book placeholder color so the shelf is scannable.
- **Suggested command:** `/impeccable polish src/app/components/RecentlyCoverCard.vue`

### [P3] Sub-44px touch targets on mobile
- **Location:** search input (256×**38**), Grid/List view toggle (40×**28** each), "See all" link (43×**20**) — measured at 390px.
- **Category:** Accessibility / Responsive.
- **Impact:** Below the 44×44 AAA target guideline; the 20px-tall "See all" link is under WCAG 2.2 SC 2.5.8 (24px) though the inline-link exception likely applies. Minor on a desk-first operator app, real on a phone.
- **Recommendation:** Pad the toggle and search control to ≥44px tap height on touch viewports.
- **Suggested command:** `/impeccable adapt src/app/views/LibraryBrowse.vue`

### [P3] Reader footer metadata truncates on phone
- **Location:** reader `contentinfo` footer at 390px — `p. 350 / 522 · 189 min le…` is clipped.
- **Category:** Responsive.
- **Impact:** The "minutes left" fact is cut off on narrow phones. Cosmetic; the position still reads.
- **Recommendation:** Let the footer wrap or drop the "min left" segment below a breakpoint.
- **Suggested command:** `/impeccable adapt src/app/components/reader`

### [P3] Off-ramp micro font-sizes and two undocumented mat colors
- **Location:** `text-[10px]` / `0.65rem` / `0.7rem` / `0.6875rem` mono micro-labels in `RecentlyCoverCard.vue`, `KeepReadingCard.vue`, `DisplayPanel.vue`, `SettingsExtensions.vue`, `CapabilityMissingModal.vue`, `ReaderTopBar.vue`; undocumented `#efe7d3` / `#e8dfc8` in `ReaderSpread.vue:54` (the paper-mat gradient). All **advisory** in `detect.mjs`.
- **Category:** Theming (design-system drift).
- **Impact:** Small, mostly-justified deviations (badge micro-type, the paper mat). Worth folding into the token system or documenting as intentional steps.
- **Recommendation:** Add the sub-`0.75rem` mono step to the ramp (or round these to `0.75rem`) and document the mat colors.
- **Suggested command:** `/impeccable polish src/app/components/reader`

---

## Patterns & Systemic Issues

- **`installed` conflates "installed" with "enabled"** (registry semantics leak into the UI). One conceptual fix (P1) removes a whole class of confusing states — it is the root of the disable=uninstall bug and any future "enabled count" surface.
- **Reading-theme colors live in two places** (reader-css.ts + DisplayPanel.vue). This duplication is why the sepia AAA miss is a two-file fix and is a standing risk that swatches drift from what actually renders. Extract once.
- **"Trusting `response.ok` on a same-origin fetch that SPA-falls-back to `index.html`"** is the shape of the P0 bug — worth a guard anywhere the app fetches binary assets by convention path.
- **The palette split is honored to a fault:** chrome never follows the reading theme, which is correct for book *content* but wrong for reader *chrome* in Dark mode (P2). The rule needs one sanctioned exception: chrome tone may track the reading theme.

## Positive Findings (keep and replicate)

- **The core journey is genuinely excellent** — Komga connect → library → detail → reader-at-stored-position → theme/typeface/layout switching → page turns, all with a **clean console**. Progress resume (`p. 349–350 / 522`, 67%, "Last read 3m ago on Edda (Web)") is exactly the product promise made real.
- **Accessibility is a strength, not an afterthought:** confirmed a global `2px` Terre-Verte `:focus-visible` ring, correct roles throughout (`switch`, `dialog`, `progressbar`, `slider`, `group`, `aria-current`), clean h1→h2→h3 hierarchy, labeled fields, and `aria-hidden` on decorative covers with the accessible title duplicated as text. axe reports 0 serious/critical (gated by `pnpm test:a11y`).
- **The Display preferences sheet** is model product UI — theme swatches preview their real colors, typeface tiles show the actual face, Paged⇄Scroll is a real toggle that visibly changes reading mode. Earned familiarity, zero invented affordances.
- **The add-source probe UI** (Reachable status on the field itself, "Adapter ready", capability chips) is "legible machinery" done right — the only blemish is the console noise behind it (P2).
- **Empty states teach** ("No downloads yet → Download a book from its detail page to read it offline. It will appear here and bypass the network entirely.").
- **Responsive collapse is structural** (sidebar → bottom tab bar), no horizontal overflow at 390px, fixed rem type per spec.
- **The design system is real and enforced** — tokens in `main.css @theme`, DESIGN.md + machine-readable sidecar, and `detect.mjs` finds only advisory drift, no warnings/errors in shipped chrome.

---

## Recommended Actions (priority order)

1. **[P0] `/impeccable harden src/plugins/connectors/fixture/index.ts`** — reject a non-binary `content-type` instead of trusting `response.ok`; make an unopenable fixture book honest in the UI so the reader stops dying on SPA-fallback HTML.
2. **[P1] `/impeccable clarify src/app/views/SettingsExtensions.vue`** — make "disable" stop reading as "uninstall": keep disabled-but-installed plugins in the Installed list with the toggle off; reserve Available/Install for never-installed plugins.
3. **[P2] `/impeccable optimize`** (add-source prober) — probe an `/api` path or swallow the expected CORS failure so a successful connect logs no red errors.
4. **[P2] `/impeccable polish src/app/components/reader`** — give the reader chrome/mat a dark variant that tracks the Dark reading theme (chrome tokens only; leave book text to readium-css). Also fold in the phone-footer truncation and micro-type drift.
5. **[P2] `/impeccable polish src/platform/web/reader-frame/reader-css.ts`** — extract the duplicated four-theme colors to one shared constant and bump sepia fg `#5b4a36 → #584734` (7.22:1) to clear the committed AAA reading bar.
6. **[P2] `/impeccable polish src/app/components/RecentlyCoverCard.vue`** — wire Komga thumbnails into the library grid (or derive per-book placeholder colors) so the shelf is scannable instead of a wall of identical green blocks.

> Run these one at a time, all at once, or in any order. Re-run `/impeccable audit` after fixes to see the score move — a11y, perf, responsive, and theming all sit at 3 and each has one concrete lever to reach 4.
