# Traceability matrix — «Гривня» (Stage 11, CHECKLIST G6)

> Every requirement in [requirements.md](../requirements.md) (`FR-*`/`NFR-*`/`TC-*`/`BC-*`)
> mapped to its spec, implementation, and verification evidence. This is the richer,
> human-readable counterpart to `npm run check:trace`, which only checks that every
> MVP FR is *cited* in a spec — this matrix traces all the way to code and tests.
> File:line citations were re-verified against the current tree while writing this
> (via `grep -rn "@trace"`), not carried forward from memory.

**Coverage: 25/25 MVP FRs implemented and tested, 1/1 Future FR (`FR-SAYINGS-01`)
implemented and tested, 8/8 NFRs satisfied, 6/6 TCs satisfied, 4/4 BCs satisfied.**

---

## Functional Requirements

### `app-shell`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-SHELL-01 | Header lockup + subtitle, theme toggle, main, footer | [spec](../../openspec/specs/app-shell/spec.md) | `AppHeader.tsx`, `AppFooter.tsx`, `AppShell.tsx` | — (structural) | `e2e/core-flow.spec.ts` (header/footer visible); `evals/cases/app-shell.eval.ts` |
| FR-SHELL-02 | Two-column desktop, single-column under ~1100px | [spec](../../openspec/specs/app-shell/spec.md) | `AppShell.tsx:44`, `app/globals.css` `.shell-main` `@media (min-width:1100px)` | — (CSS) | `e2e/responsive.spec.ts` — measures actual `grid-template-columns` track count at 768px/1280px, plus sticky-column behavior |
| FR-SHELL-03 | Theme toggle via `data-theme`, no flash, `localStorage` only | [spec](../../openspec/specs/app-shell/spec.md) | `lib/theme/theme.ts`, `ThemeScript.tsx` (blocking inline script), `AppHeader.tsx:7` | `lib/theme/theme.test.ts` (3 `@trace` blocks) | `e2e/a11y.spec.ts` (dark-theme toggle exercised in 2 of 5 cases) |
| FR-SHELL-04 | Honest empty/loading skeleton, never blank crash | [spec](../../openspec/specs/app-shell/spec.md) | `ShellSkeleton.tsx`, `AppShell.tsx:44` `ShellSlot` | — (structural) | `evals/cases/app-shell.eval.ts` |

### `i18n`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-I18N-01 | All user-facing strings centralised, no inline literals | [spec](../../openspec/specs/i18n/spec.md) | `lib/i18n/uk.ts` | `lib/i18n/uk.test.ts:13,32,52` (zero-stray-literal recursive scan in `review-findings.md`) | `evals/cases/i18n.eval.ts` |

### `currency-list`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-RATES-01 | Fetch today's rates server-side on load | [spec](../../openspec/specs/currency-list/spec.md) | `lib/nbu/fetchTodayRates.ts`, `app/page.tsx:7` | `lib/nbu/fetchTodayRates.test.ts:17` | `e2e/core-flow.spec.ts` ("loads the rates list with live NBU data") |
| FR-RATES-02 | List row: avatar, code, name, mono rate, unit | [spec](../../openspec/specs/currency-list/spec.md) | `lib/nbu/mapRates.ts`, `CurrencyRow.tsx:13` | `lib/nbu/mapRates.test.ts:4` | `e2e/core-flow.spec.ts` |
| FR-RATES-03 | Honest stale-date label, real `exchangedate` | [spec](../../openspec/specs/currency-list/spec.md) | `lib/nbu/kyivDate.ts` (`isStaleRate`), `app/page.tsx:7` | `lib/nbu/kyivDate.test.ts:10,27` | `evals/cases/currency-list.eval.ts` |
| FR-RATES-04 | Selecting a row sets the active currency | [spec](../../openspec/specs/currency-list/spec.md) | `CurrencyRow.tsx:13`, `RatesView.tsx:20` | — (UI state) | `e2e/core-flow.spec.ts` ("selecting a currency shows the converter…") |
| FR-RATES-05 | Fetch failure → visible degraded state, never 500/blank | [spec](../../openspec/specs/currency-list/spec.md) | `app/api/rates/route.ts`, `RatesView.tsx:20` (`rates-error` + retry) | `lib/nbu/fetchTodayRates.test.ts:17` | `evals/cases/currency-list.eval.ts` |

### `currency-picker`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-PICK-01 | Filter by ISO code or Ukrainian name | [spec](../../openspec/specs/currency-picker/spec.md) | `lib/currency/filterRates.ts`, `RatesView.tsx:21` | `lib/currency/filterRates.test.ts:11` | `e2e/core-flow.spec.ts` ("filtering the list narrows it…") |
| FR-PICK-02 | No-match → inline «Нічого не знайдено», no toast | [spec](../../openspec/specs/currency-picker/spec.md) | `RatesView.tsx:21`, `uk.picker.noMatch` | `lib/i18n/uk.test.ts:70` | `e2e/core-flow.spec.ts`; `evals/cases/currency-picker.eval.ts` |
| FR-PICK-03 | Selecting from filtered list sets active currency | [spec](../../openspec/specs/currency-picker/spec.md) | `RatesView.tsx:21` | — (UI state) | `evals/cases/currency-picker.eval.ts` |

### `converter`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-CONVERT-01 | Bidirectional UAH ⇄ active currency at official rate | [spec](../../openspec/specs/converter/spec.md) | `lib/currency/convert.ts`, `Converter.jsx` | `lib/currency/convert.test.ts:4`; `convertFlow.integration.test.ts:17` | `e2e/core-flow.spec.ts` ("converting an amount updates the UAH result") |
| FR-CONVERT-02 | Locale-aware input (comma decimals, trailing zeros, spaces) | [spec](../../openspec/specs/converter/spec.md) | `lib/currency/parseAmount.ts` | `lib/currency/parseAmount.test.ts:4`; `convertFlow.integration.test.ts:17` | — |
| FR-CONVERT-03 | Swap control flips direction | [spec](../../openspec/specs/converter/spec.md) | `lib/currency/convert.ts` (`ConvertDirection`), `Converter.jsx` swap button | `lib/currency/convert.test.ts:4` | — |
| FR-CONVERT-04 | uk-UA formatting, mono tabular | [spec](../../openspec/specs/converter/spec.md) | `lib/currency/formatAmount.ts` (converted amounts), `lib/currency/formatRate.ts` (rate display, added Stage 10) | `lib/currency/formatAmount.test.ts:4`; `lib/currency/formatRate.test.ts:5` | — |
| FR-CONVERT-05 | Invalid/empty input → 0, never `NaN`/crash | [spec](../../openspec/specs/converter/spec.md) | `lib/currency/parseAmount.ts`, `lib/currency/convert.ts` | `lib/currency/convert.test.ts:4`; `convertFlow.integration.test.ts:17` (garbage-input case) | — |

### `rate-history`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-HISTORY-01 | ~30-day line of the active currency's rate | [spec](../../openspec/specs/rate-history/spec.md) | `lib/nbu/mapHistory.ts`, `HistoryChart.tsx` | `lib/nbu/mapHistory.test.ts:11` | `e2e/core-flow.spec.ts` (chart SVG visible) |
| FR-HISTORY-02 | NBU range endpoint, date-iteration fallback (ADR-0002) | [spec](../../openspec/specs/rate-history/spec.md) | `lib/nbu/fetchHistory.ts`, `lib/nbu/historyWindow.ts` | `lib/nbu/fetchHistory.test.ts:17`; `lib/nbu/historyWindow.test.ts:4`; `lib/nbu/kyivDate.test.ts:46,61` | — |
| FR-HISTORY-03 | Skeleton / honest empty / visible error degrade | [spec](../../openspec/specs/rate-history/spec.md) | `CurrencyHistory.tsx:23` (loading/error/empty states + Stage-10 retry button) | `lib/nbu/fetchHistory.test.ts:17` | `evals/cases/rate-history.eval.ts` |
| FR-HISTORY-04 | Padded y-domain, not dramatised | [spec](../../openspec/specs/rate-history/spec.md) | `HistoryChart.tsx` (`pad = max((max-min)*0.35, max*0.004)`) | — (visual) | `evals/cases/rate-history.eval.ts` |

### `trend-hint`

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-TREND-01 | 7-day signed % move vs UAH | [spec](../../openspec/specs/trend-hint/spec.md) | `lib/currency/weeklyMove.ts` | `lib/currency/weeklyMove.test.ts:8` | `e2e/core-flow.spec.ts` (trend hint `data-tone` shape) |
| FR-TREND-02 | One calm sentence, direction + magnitude first | [spec](../../openspec/specs/trend-hint/spec.md) | `lib/currency/trendSentence.ts`, `uk.trend.*` | `lib/currency/trendSentence.test.ts:4`; `lib/i18n/uk.test.ts:77` | `evals/cases/trend-hint.eval.ts` |
| FR-TREND-03 | ±0.05% reads flat; tone from single `trendTone` source | [spec](../../openspec/specs/trend-hint/spec.md) | `TrendHint.tsx:14` (reuses vendored `trendTone`, not duplicated) | `lib/currency/trendSentence.test.ts:4` | `evals/cases/trend-hint.eval.ts` |

### `footer-sayings` (Future, promoted and built)

| ID | Description | Spec | Implementation | Unit test | E2E / eval |
|---|---|---|---|---|---|
| FR-SAYINGS-01 | Deterministic daily Ukrainian saying, no API/tracking | [spec](../../openspec/specs/footer-sayings/spec.md) | `lib/sayings/sayings.ts`, `lib/sayings/selectSaying.ts`, `lib/nbu/kyivDate.ts:91` (`kyivDayOfYear`) | `lib/sayings/sayings.test.ts:4`; `lib/sayings/selectSaying.test.ts:6` | `e2e/core-flow.spec.ts` ("footer shows the NBU provenance line and a daily saying"); `evals/cases/footer-sayings.eval.ts` |

---

## Non-Functional Requirements

| ID | Description | Evidence |
|---|---|---|
| NFR-I18N-01 | Strings in `lib/i18n/uk.ts`, typed accessor, no runtime i18n lib | `lib/i18n/uk.ts` is `as const`-typed; grepped — no `i18next`/`react-intl` etc. in `package.json` |
| NFR-A11Y-01 | Always-visible focus ring | `:where(a,button,select,textarea,[tabindex]):focus-visible { box-shadow: var(--focus-ring) }` in `app/globals.css`; `e2e/a11y.spec.ts` "focus is always visible" — a *differential* check (ring changes on focus, not just present) |
| NFR-A11Y-02 | WCAG AA contrast, both themes | `e2e/a11y.spec.ts` — `@axe-core/playwright`, WCAG 2 A+AA tags, 4 scenarios (light/dark × empty/selected). Found and fixed 2 real contrast failures in Stage 8 (`app/styles/tokens/colors.css`) |
| NFR-A11Y-03 | Motion respects `prefers-reduced-motion` | `app/globals.css` durations collapse to `0s` under `@media (prefers-reduced-motion: reduce)`; `HistoryChart.tsx` sets `isAnimationActive={false}` unconditionally (chart animation off by default, not just reduced-motion-gated) |
| NFR-LOCALE-01 | uk-UA number formatting, mono tabular | `lib/currency/formatAmount.ts`, `lib/currency/formatRate.ts`; both colocated-tested; Stage 10 found and fixed a precision inconsistency between them (see `docs/qa/eval-report.md` Global Review) |
| NFR-OBS-01 | No uncaught errors, silent console, visible degrade on failure | `app/api/rates/route.ts` + `app/api/history/route.ts` return `{ok:false}` envelopes, never throw; `convertFlow.integration.test.ts:17` proves garbage input never throws across the full pipeline; `e2e/*.spec.ts` runs read the browser console in practice via the maker's manual verification passes (no uncaught-error assertion automated yet — see risk register) |
| NFR-COST-01 | Zero env vars | `.env.example` documents zero vars required; `NBUStatService` is keyless (ADR-0002) |
| NFR-PERF-01 | Server-side NBU calls, in-memory cache | `app/page.tsx` is `○ Static` with `Revalidate 1h` (confirmed via `npm run build`'s route summary every verify run); `/api/rates`, `/api/history` are `ƒ Dynamic` |

## Technical Constraints

| ID | Description | Evidence |
|---|---|---|
| TC-STACK-01 | Next.js 16.2 · TypeScript strict · React 19.2 | `package.json` (`next@16.2.9`, `react@19.2.4`); `tsconfig.json` `"strict": true` |
| TC-STYLE-01 | Tailwind 4 + vendored design tokens, semantic aliases only | `app/styles/tokens/*.css`; reviewed in every per-slice `review-findings.md` ("grepped for raw hex/ramp tokens — zero matches") |
| TC-DATA-01 | NBU is the only data source, server-side only | Re-verified for this matrix: `grep -rn "fetchTodayRates\|fetchHistory" components/ app/` — the only real call sites are `app/page.tsx` and the two Route Handlers; `RatesView.tsx`'s only reference is a type-only import (erased at compile time) |
| TC-CHART-01 | Recharts, graceful degrade | `HistoryChart.tsx` imports `recharts` directly (ADR-0004 supersedes the original UMD-global plan — real npm import, not `window.Recharts`, to avoid dual-React-instance risk) |
| TC-PURE-01 | `lib/` framework-free | Re-verified for this matrix: `grep -rln "from \"react\"\|from 'react'\|from \"next\|from 'next" lib/` — zero matches |
| TC-TEST-01 | Vitest for unit, Playwright for e2e + axe | `vitest.config.ts`, `playwright.config.ts`, `e2e/a11y.spec.ts` |

## Business Constraints

| ID | Description | Evidence |
|---|---|---|
| BC-BRAND-01 | Ukrainian-first, calm, no exclamation marks | `lib/i18n/uk.test.ts:32,77` (no-exclamation-mark assertions); `lib/sayings/sayings.test.ts:4`; independently re-verified by both Stage 10 global checkers reading every string in `uk.ts` + all 12 sayings |
| BC-PRIVACY-01 | No accounts/DB/cookies/analytics/trackers | Re-verified for this matrix: `grep -rln "document.cookie\|gtag\|analytics\|googletag" app/ components/ lib/` — zero matches; no `package.json` dependency in that category |
| BC-SOURCE-01 | Official NBU daily rate only, footer credits NBU | `app/footer-sayings`'s `uk.shell.footerProvenance` = "Дані: відкритий API НБУ · без кук і трекерів"; `ADR-0002` |
| BC-HONESTY-01 | Stale rates labelled honestly, no buy/sell advice | `lib/nbu/kyivDate.ts` (`isStaleRate`), never `toISOString().slice(0,10)` (grepped clean in every per-slice review); no advice copy anywhere in `uk.ts` |

---

## How this matrix was built

Read `docs/requirements.md` for the canonical ID list, then cross-referenced against
`grep -rn "@trace" lib/ components/ app/ evals/ e2e/` (every `@trace`-annotated test
and component) plus the `traces:` arrays in `evals/cases/*.eval.ts`. Three claims
(TC-PURE-01, TC-DATA-01, BC-PRIVACY-01) were independently re-grepped while writing
this document rather than carried forward from prior review notes, since those are
exactly the kind of claim that silently rots as code changes.
