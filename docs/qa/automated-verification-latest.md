# Automated verification — latest run (CHECKLIST G5)

> Cross-cutting hardening: integration test + Playwright e2e (core flow,
> responsive breakpoints, axe a11y light/dark) + the full `npm run verify`
> battery, all run together as a single point-in-time snapshot. Updated each
> time this battery is re-run; not a historical log (see git history for that).

## Last run

`2026-06-30T20:05:00+03:00` (Europe/Kyiv), against `1981e1e` + Stage 8 changes
(uncommitted at the time of this run — see the commit this file ships in).

## Summary

| Layer | Command | Result |
| --- | --- | --- |
| Unit + integration (Vitest) | `npm run test:run` | **117 / 117 passed** (17 files) |
| Lint | `npm run lint` | **clean** |
| Traceability | `npm run check:trace` | **25/25 MVP FRs cited** (1 Future FR not required) |
| OpenSpec | `npm run spec:validate` | **9/9 specs valid** (`--strict`) |
| Build | `npm run build` | **green** — 4 routes, 2 static + 2 dynamic |
| E2E (Playwright, Chromium, headless) | `npm run test:e2e` | **14 / 14 passed** |

`npm run verify` (lint → check:trace → spec:validate → build) and
`npm run test:e2e` were run as fully separate invocations and both reported
green on the same tree.

---

## 1. Integration test — convert → display flow

**File:** [`lib/currency/convertFlow.integration.test.ts`](../../lib/currency/convertFlow.integration.test.ts)

Composes the real pipeline across two modules — NBU response mapping
(`lib/nbu/mapRates`) and the converter chain (`parseAmount` → `convert` →
`formatAmount`) — exactly as the app wires them, without mocking any
individual step. 6 cases:

- Maps a realistic NBU response (including malformed entries), converts a
  locale-aware comma-decimal amount foreign→UAH.
- Converts UAH→foreign for a small-rate currency (JPY) without precision loss.
- Proves malformed NBU entries (non-finite rate, missing rate) are dropped at
  the mapping stage — they can never reach the converter through real data.
- Garbage user input (`""`, `"   "`, `"abc"`, `null`, `undefined`) flows
  through to an honest `0,00` display, never `NaN` or a throw (NFR-OBS-01).
- A defensively-invalid rate (0) still degrades to `0,00`.
- Round-trips foreign→UAH→foreign within floating-point tolerance.

**Result:** 6/6 passed.

---

## 2. Playwright e2e

**Config:** [`playwright.config.ts`](../../playwright.config.ts) — headless
Chromium, runs against a real `next dev` server on port 3100, hitting **live
NBU data** (no mocking — consistent with how every slice in this project was
verified through Stage 5).

### 2.1 Core flow — [`e2e/core-flow.spec.ts`](../../e2e/core-flow.spec.ts)

| Test | Traces | Result |
| --- | --- | --- |
| Loads the rates list with live NBU data | FR-RATES-01 | pass |
| Selecting a currency shows the converter, history chart, and trend hint | FR-RATES-04, FR-CONVERT-01, FR-HISTORY-01, FR-TREND-01/02/03 | pass |
| Converting an amount updates the UAH result | FR-CONVERT-01…05 | pass |
| Filtering narrows the list; a non-match shows the honest empty message | FR-PICK-01/02/03 | pass |
| Footer shows NBU provenance and a daily saying | FR-SHELL-01, FR-SAYINGS-01 | pass |

### 2.2 Responsive — [`e2e/responsive.spec.ts`](../../e2e/responsive.spec.ts)

Measures actual computed `grid-template-columns` track counts and
`position` values rather than eyeballing a screenshot (same DOM-measurement
discipline used to verify the chart X-axis clipping fix in `rate-history`).

| Test | Traces | Result |
| --- | --- | --- |
| Stacks to a single column below 1100px | FR-SHELL-02 | pass |
| Splits into two columns at/above 1100px | FR-SHELL-02 | pass |
| A 375px mobile viewport still renders header, search, a currency row | FR-SHELL-02 | pass |
| The sticky focus column only applies at the desktop breakpoint | FR-SHELL-02 | pass |

### 2.3 Accessibility (axe) — [`e2e/a11y.spec.ts`](../../e2e/a11y.spec.ts)

`@axe-core/playwright`, WCAG 2 A + AA tag set, run on the empty state and
with a currency selected, in both themes.

| Test | Traces | Result |
| --- | --- | --- |
| Light theme, empty state: no WCAG violations | NFR-A11Y-02 | pass |
| Light theme, currency selected: no WCAG violations | NFR-A11Y-02 | pass |
| Dark theme: no WCAG violations | NFR-A11Y-02 | pass |
| Dark theme, currency selected: no WCAG violations | NFR-A11Y-02 | pass |
| Focus ring visibly changes on focus (differential check, not just "has a shadow") | NFR-A11Y-01 | pass |

**This pass found and fixed three real, pre-existing defects** (not test
artifacts — axe was run against the actual rendered app, and these failed on
first run):

1. **Color contrast, light theme:** `--text-muted` (`#7e7560`) reached only
   4.16–4.48:1 against the app's warm-cream surfaces — under WCAG AA's 4.5:1
   floor at the small font sizes it's used at (currency names, header
   subtitle, converter unit suffix). `--text-faint` (`#a39a84`) was worse,
   2.63:1, on the footer saying added in the `footer-sayings` slice.
   **Fixed:** retuned both tokens in `app/styles/tokens/colors.css` to the
   minimum darkening that clears 4.5:1 with margin, computed via the actual
   WCAG relative-luminance formula, not guessed.
2. **Color contrast, dark theme:** `--text-faint` (`var(--paper-500)`)
   reached only 4.22:1 on the dark background; `AsOfBadge`'s stale-rate
   styling hard-coded `var(--brass-600)` — a light-theme-tuned color with no
   dark variant — which read at 2.5:1 against the dark accent-soft
   background. **Fixed:** lightened dark `--text-faint`; added a new
   theme-aware `--accent-strong` semantic alias (light: `brass-600`, dark:
   `brass-300`) and pointed `AsOfBadge` and `Badge`'s `accent` tone at it
   instead of the raw, theme-blind value.
3. **Missing accessible name, critical (WCAG 4.1.2):** the converter's
   amount `<input>` had a visual `<label>` above it with no `htmlFor`/`id`
   link and no `aria-label` — axe correctly flagged it as unlabeled.
   **Fixed:** added a dynamic `aria-label` to the `Input` call in
   `components/ds/rates/Converter.jsx`, matching the visible label text.

None of these were caught during the per-slice reviews because no automated
a11y scan existed before this stage — exactly the gap Stage 8 closes.

---

## 3. Known gaps (carried forward, not blocking)

- **No real vision check of the rendered UI** — axe catches WCAG-detectable
  issues only (contrast, missing labels, ARIA misuse); it is blind to
  "looks interactive but isn't" style defects, layout overlap a screenshot
  would catch instantly, or general visual polish. That pass belongs to
  Stage 13 (recorded demo / vision-judge pass), flagged since `rate-history`.
- **E2E tests hit live NBU data**, not a fixture. This is a deliberate
  choice consistent with every other verification pass in this project, but
  it does mean a flaky/slow NBU response could make a CI run flaky too —
  acceptable for this project's scale and stated trade-offs (TC-DATA-01).
