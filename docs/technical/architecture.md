# Technical architecture — «Гривня»

> Where things live and why. Decisions are recorded in [docs/adr/](../adr/);
> this doc is the map, not the rationale. Kept deliberately short — KISS/YAGNI
> (see `HRYVNIA_PROJECT_PLAN.md` §0): a keyless, database-free app doesn't
> need a multi-page architecture document to be understood.

## Stack

Next.js 16.2 App Router · TypeScript strict · React 19.2 · Tailwind CSS 4 ·
Recharts · Vitest · Playwright. Zero database, zero auth, zero env vars
(`TC-STACK-01`, `NFR-COST-01`). Full rationale in
[ADR-0001](../adr/ADR-0001-stack.md).

## Directory map

```
app/
  page.tsx              Server Component entry point — the only place
                         that calls fetchTodayRates() / new Date() for
                         server-computed values (isStaleRate, the footer
                         saying). Everything date-dependent is computed
                         once here and threaded down as props, never
                         recomputed client-side (avoids hydration
                         mismatches — see "Hydration boundary" below).
  api/rates/route.ts     Route Handler — proxies lib/nbu/fetchTodayRates,
                         used by the client-side retry path.
  api/history/route.ts   Route Handler — proxies lib/nbu/fetchHistory,
                         used by CurrencyHistory's client-side fetch.
  globals.css            Imports app/styles/tokens/*; shell/list/converter/
                         chart CSS classes (semantic tokens only).
  styles/tokens/         Design tokens — colors.css (light/dark semantic
                         aliases over a raw palette), fonts, typography,
                         spacing, motion. Live app code, NOT the vendored
                         boundary (see "Vendored vs. authored" below).

lib/                     Framework-free domain logic (TC-PURE-01). No
                         `next/*`, no `react`, no DOM globals. Every module
                         has a colocated *.test.ts.
  nbu/                   NBU response -> domain types, date arithmetic.
    mapRates.ts            Raw "today" JSON -> Rate[], drops malformed rows.
    mapHistory.ts           Raw history JSON -> HistoryPoint[].
    fetchTodayRates.ts      Server-side fetch wrapper, {ok:false} on failure.
    fetchHistory.ts         Same, for the ~30-day history window.
    historyWindow.ts        Computes the date range to request.
    kyivDate.ts              Europe/Kyiv date arithmetic: kyivDateString,
                             isStaleRate, addKyivDays, kyivDayOfYear. UTC-
                             anchored; never toISOString().slice(0,10).
  currency/               Pure conversion/formatting/analysis.
    parseAmount.ts           Locale-aware string -> number, total.
    convert.ts                Bidirectional UAH <-> foreign at a rate.
    formatAmount.ts           Fixed 2-decimal uk-UA format (converted
                              money amounts only).
    formatRate.ts             2-4 decimal uk-UA format (official rates —
                              added Stage 10 to fix a precision-consistency
                              defect; see docs/qa/risk-register.md R-05).
    filterRates.ts            Code/name substring filter.
    weeklyMove.ts              7-day signed % move.
    trendSentence.ts           Renders the calm trend sentence.
    convertFlow.integration.test.ts   Composes the above end-to-end.
  i18n/uk.ts               The single source of truth for every Ukrainian
                           UI string (NFR-I18N-01). Typed, as const.
  sayings/                 The 12-entry footer-saying corpus + deterministic
                           day-of-year selection (FR-SAYINGS-01).
  theme/theme.ts            Theme-preference parse/serialise (localStorage).

components/
  app-shell/               Header, footer, shell grid, loading skeleton,
                           the blocking inline theme-bootstrap script.
  rates/                   RatesView (client orchestrator: selection,
                           filter, retry), CurrencyRow, CurrencyFocusPanel,
                           CurrencyHistory, HistoryChart, TrendHint.
  ds/                       Vendored design-system components (see below).

evals/cases/*.eval.ts     One rubric per capability's qualitative surface,
                          graded by the kurs-eval-judge checker role.

e2e/*.spec.ts             Playwright: core flow, responsive breakpoints,
                          axe a11y (light + dark) — headless, against a
                          real dev server, live NBU data.
```

## Vendored vs. authored (the design-system boundary)

`components/ds/**` and `docs/design-system/**` are the vendored design-system
output (generated once via the `claude design` skill, see
`docs/design-system/SKILL.md`) — treated as a **read-only upstream
reference**; live adaptations only add `'use client'` and are excluded from
ESLint (see `eslint.config.mjs`'s comment). `app/styles/tokens/**` is
**not** part of that boundary — it's live application code that happens to
have been seeded from the same vendor drop, and was edited directly during
Stage 8 to fix two real WCAG contrast defects (`docs/qa/risk-register.md`
R-01/R-02).

`components/rates/**` and `components/app-shell/**` are fully authored —
they consume `@/components/ds` primitives (`Button`, `Input`, `Switch`,
`CurrencyAvatar`, `AsOfBadge`, `Converter`) but compose the app's own
layout, state, and error handling. Two vendored *composite* components
(`RateRow`, `CurrencyPicker`) are deliberately **not** reused, because they
bake in a fabricated trend pill / extra copy this app has no honest data
for at the currency-list layer — see `design.md` Decision 2 in the archived
`currency-list` change folder.

## Hydration boundary (the one recurring architectural risk)

Every component reached through `RatesView`'s `"use client"` render tree —
even ones without their own `"use client"` directive — is part of the
client bundle and therefore unsafe for a direct `new Date()` call (it could
disagree with the server-rendered HTML if the wall clock rolls over a day
boundary between SSR and hydration). The fix, applied consistently every
time this came up (`currency-list`'s `isStaleRate`, `footer-sayings`'s
`selectSaying`), is the same: compute the value once in `app/page.tsx` (the
one true Server Component) and thread it down as a plain prop. No client
component in this app calls `new Date()` directly — verified by grep at
every relevant slice review.

## Data flow

See [data-flow.md](data-flow.md) for the request lifecycle: server-side
NBU fetch on first load, client-side retry path, and the rate-history
fetch triggered by currency selection.

## Testing layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Every `lib/` module, colocated `*.test.ts`, `@trace FR-x` |
| Integration | Vitest | `convertFlow.integration.test.ts` — composes `lib/nbu` + `lib/currency` end-to-end without mocking |
| E2E | Playwright | Core user flow, responsive breakpoints, against live NBU |
| Accessibility | Playwright + `@axe-core/playwright` | WCAG 2 A+AA, light + dark, empty + selected states |
| Quality (qualitative) | `kurs-eval-judge` (checker role) | `evals/cases/*.eval.ts` rubrics — tone, clarity, honesty |

## Why no database, no auth, no client-side NBU calls

- **No database** — the app has no user-specific state to persist; every
  view is a pure function of "today's NBU data" (`BC-PRIVACY-01`).
- **No auth** — nothing to protect; the data is public.
- **NBU called server-side only** (`TC-DATA-01`) — keeps the keyless,
  public `NBUStatService` endpoint out of client network logs and avoids
  CORS entirely; the browser only ever talks to this app's own Route
  Handlers.
