# Requirements — «Гривня»

> The traceable source of truth for **what** to build and **how** to verify it.
> Narrative and intent live in [product-brief.md](product-brief.md); decisions in
> [adr/](adr/); visual identity in [../DESIGN.md](../DESIGN.md).
>
> **Stable IDs.** Every requirement id (`FR-/NFR-/TC-/BC-`) is stable for the life
> of the project and is **never renumbered**. New requirements append.
> **Phase.** `MVP` = in scope now; `Future` = deferred (still recorded).
> Each MVP `FR-*` is cited in exactly one OpenSpec capability spec under
> [../openspec/specs/](../openspec/specs/).

---

## Functional Requirements (FR)

### Shell & navigation — capability `app-shell`

| ID | Phase | Description |
|---|---|---|
| FR-SHELL-01 | MVP | Single-page shell: header (the «Гривня» lockup + «Офіційний курс НБУ» subtitle, a theme toggle), a main content area, and a footer. |
| FR-SHELL-02 | MVP | Responsive layout: desktop is a two-column split (rates list · focus + detail) that stacks to a single column under ~1100 px; mobile is single-column. |
| FR-SHELL-03 | MVP | Light/dark theme toggle via `data-theme` on `<html>`, no flash; the choice may persist in `localStorage` (no cookies). |
| FR-SHELL-04 | MVP | First-load, empty and loading states are honest — a skeleton of equal footprint while data loads; never a blank crash. |

### Internationalisation — capability `i18n`

| ID | Phase | Description |
|---|---|---|
| FR-I18N-01 | MVP | All user-facing strings are centralised (no inline literals in components) so the Ukrainian-first copy is edited in one place. |

### Currency list (today's rates) — capability `currency-list`

| ID | Phase | Description |
|---|---|---|
| FR-RATES-01 | MVP | On load, fetch today's official rates from the NBU exchange endpoint (server-side). |
| FR-RATES-02 | MVP | Render a list of supported currencies; each row shows flag, ISO code, Ukrainian name, the official rate (mono tabular, uk-UA format) and unit. |
| FR-RATES-03 | MVP | Show the effective NBU date; when the figure is a previous business day's (weekend/holiday), label it stale honestly («Курс за DD.MM.YYYY»), never a fake "today". |
| FR-RATES-04 | MVP | Selecting a currency row sets the active currency for the focus/detail panel. |
| FR-RATES-05 | MVP | On fetch failure (network / non-200 / timeout), show a visible degraded state; never a 500 or a blank screen. |

### Currency picker / filter — capability `currency-picker`

| ID | Phase | Description |
|---|---|---|
| FR-PICK-01 | MVP | A single input filters the currency list by ISO code or Ukrainian name. |
| FR-PICK-02 | MVP | If the filter matches nothing, show inline «Нічого не знайдено» — no toast, no error. |
| FR-PICK-03 | MVP | Selecting from the filtered list sets the active currency. |

### Converter — capability `converter`

| ID | Phase | Description |
|---|---|---|
| FR-CONVERT-01 | MVP | Convert between UAH and the active currency at the official rate, in both directions. |
| FR-CONVERT-02 | MVP | Amount input is locale-aware: accepts comma decimals («100,50») and trailing zeros, and ignores stray spaces. |
| FR-CONVERT-03 | MVP | A swap control flips the direction (UAH → foreign / foreign → UAH). |
| FR-CONVERT-04 | MVP | Results are formatted in uk-UA (comma decimal, thin-space thousands, ₴ after the number) in mono tabular figures. |
| FR-CONVERT-05 | MVP | Invalid or empty input resolves to 0 (or a calm hint) — never `NaN`, never a crash. |

### Rate history chart — capability `rate-history`

| ID | Phase | Description |
|---|---|---|
| FR-HISTORY-01 | MVP | Show a ~30-day line of the active currency's official UAH rate. |
| FR-HISTORY-02 | MVP | Fetch the history window from NBU (range endpoint verified live; date-iteration fallback per ADR-0002). |
| FR-HISTORY-03 | MVP | Loading shows a skeleton of equal footprint; no data shows an honest empty state; fetch failure degrades visibly. |
| FR-HISTORY-04 | MVP | The y-domain is padded around the data so small moves read honestly, not dramatised. |

### Trend hint — capability `trend-hint`

| ID | Phase | Description |
|---|---|---|
| FR-TREND-01 | MVP | Compute the recent move (7-day) of the active currency vs UAH as a signed percentage. |
| FR-TREND-02 | MVP | Render one calm Ukrainian sentence leading with direction + magnitude («Долар за тиждень зміцнів на 1,2% до гривні»). |
| FR-TREND-03 | MVP | A move within ±0.05% reads as flat («майже без змін»); tone (up/down/flat) comes from the single `trendTone` source of truth. |

### Footer sayings — capability `footer-sayings`

| ID | Phase | Description |
|---|---|---|
| FR-SAYINGS-01 | Future | Footer shows a deterministic Ukrainian money one-liner chosen by day-of-year; no API, no tracking; calm, no exclamation marks. Optional; promote to MVP if time allows. |

---

## Non-Functional Requirements (NFR)

| ID | Phase | Description |
|---|---|---|
| NFR-I18N-01 | MVP | UI strings live in `lib/i18n/uk.ts` (primary), consumed via a typed accessor; no runtime i18n library. An `en.ts` fallback is **Future**. |
| NFR-A11Y-01 | MVP | Always-visible focus ring on every interactive element; never removed. |
| NFR-A11Y-02 | MVP | WCAG AA contrast in both light and dark themes. |
| NFR-A11Y-03 | MVP | All motion respects `prefers-reduced-motion` (durations collapse to 0; chart animation off by default). |
| NFR-LOCALE-01 | MVP | Numbers formatted with uk-UA conventions (comma decimal, thin-space thousands, ₴ after) in mono tabular figures. |
| NFR-OBS-01 | MVP | No uncaught errors; console silent on a healthy session; every external failure degrades to a visible state — never silent, never a generic 500. |
| NFR-COST-01 | MVP | Keyless and free: the app runs with **zero env vars**; no paid keys, no secrets. |
| NFR-PERF-01 | MVP | NBU calls happen server-side where possible; the last successful response is cached in memory until the currency/date changes. |

---

## Technical Constraints (TC)

| ID | Phase | Description |
|---|---|---|
| TC-STACK-01 | MVP | Next.js 16.2 App Router · TypeScript strict · React 19.2 (ADR-0001). |
| TC-STYLE-01 | MVP | Tailwind CSS 4 + the vendored «Гривня» design tokens/components; consume semantic token aliases, never raw ramps (DESIGN.md). |
| TC-DATA-01 | MVP | NBU `NBUStatService` open API is the only data source; called from Server Components / Route Handlers; never presented as if a key were required (ADR-0002). |
| TC-CHART-01 | MVP | Charts via Recharts (UMD global; graceful degrade when absent). |
| TC-PURE-01 | MVP | Domain logic lives in a framework-free `lib/` (no `next/*`, no `react`, no DOM globals); colocated `*.test.ts`. |
| TC-TEST-01 | MVP | Vitest for `lib/` unit tests; Playwright for e2e + axe a11y (light + dark). |

---

## Business Constraints (BC)

| ID | Phase | Description |
|---|---|---|
| BC-BRAND-01 | MVP | Ukrainian-first, calm, **no exclamation marks**, one-number-then-detail; visual identity per DESIGN.md. |
| BC-PRIVACY-01 | MVP | No accounts, no database, no cookies, no analytics, no third-party trackers. |
| BC-SOURCE-01 | MVP | Official NBU daily rate only (no interbank / market / intraday); the footer credits the National Bank of Ukraine open data. |
| BC-HONESTY-01 | MVP | Stale (weekend/holiday) rates are labelled with their actual date; the app reports an official number and never gives buy/sell advice. |

---

## Status legend

`MVP` — built and verified in this project. `Future` — recorded, deferred, not
built now. Phase is for the traceability checker; it does not change an id.
