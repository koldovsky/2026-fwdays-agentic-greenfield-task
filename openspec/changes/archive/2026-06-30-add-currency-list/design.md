## Context

- Baseline spec: `openspec/specs/currency-list/spec.md` (FR-RATES-01 … FR-RATES-05).
- NBU endpoints verified live (ADR-0002, while building `kurs-uah`):
  `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json` →
  array of `{ r030, txt, rate, cc, exchangedate, special }`.
- `app-shell` provides `<AppShell left right loading leftEmptyMessage
  rightEmptyMessage />`; its placeholder panels and artificial loading-skeleton
  demo were explicitly interim (`app-shell` design.md: "Until `currency-list`
  exists, the page demonstrates the loading skeleton path via a short deferred
  loading state"). This slice replaces both with real data-driven states.
- `i18n` established `lib/i18n/uk.ts` as the single string source — no inline
  literals in this slice either.

## Goals / Non-Goals

**Goals:**

- Fetch today's official rates server-side only (`TC-DATA-01`); never expose
  the NBU call as if a key were needed.
- Render every currency NBU returns (no invented "popular basket" — the
  official list **is** the supported list), sorted by code for predictability.
- Honest effective-date labelling, including the weekend/holiday stale case
  (`BC-HONESTY-01`).
- Selecting a row sets the active currency, reflected in the focus panel.
- Calm, inline, recoverable error state on fetch failure (`NFR-OBS-01`).

**Non-Goals:**

- No day-over-day trend pill on the list (see Decision 2 — no honest data yet;
  `trend-hint` computes a *weekly* move later, a different metric anyway).
- No currency filter/search (`currency-picker`, next slice).
- No conversion or history chart in the focus panel (`converter`, `rate-history`).
- No flag emojis (NBU doesn't supply country data; `CurrencyAvatar` falls back
  to the code roundel, which the design system already supports).

## Decisions

### 1. Server Component fetch + Route Handler for client retries

`app/page.tsx` becomes a Server Component: it calls `fetchTodayRates()`
directly at request time (no self-HTTP round trip) and passes the result into
the client `RatesView`. A client-triggered **retry** (after a failure) cannot
import `lib/nbu` and call NBU directly from the browser without contradicting
`TC-DATA-01`'s "never expose the call as if a key were needed" — so retry
calls a new **Route Handler**, `app/api/rates` (GET), which runs the same
`fetchTodayRates()` server-side and returns JSON. Every NBU call, first-load or
retry, happens on the server.

### 2. Don't reuse `@/components/ds`'s `RateRow` — it bakes in a trend pill

`RateRow` (vendored) always renders a `TrendBadge` from a `delta` prop
(default `0`). This slice has no day-over-day data — passing `delta={0}`
would render a "flat, no change" pill that is **fabricated**, not measured,
directly contradicting the honesty principle behind `BC-HONESTY-01` /
`NFR-OBS-01`. Instead, a slim `CurrencyRow` composes the already-shared
`CurrencyAvatar` (DS) with code/name/rate text and no trend element.
`RateRow` becomes the natural fit once `trend-hint` produces real deltas — a
later slice may switch to it then.

### 3. Pure `lib/nbu/` — mapping and date logic, fetch wrapper separate

```ts
// lib/nbu/mapRates.ts
export type Rate = { code: string; name: string; rate: number; exchangeDate: string };
export function mapNbuRates(raw: unknown): Rate[]; // total, never throws,
  // drops malformed entries defensively, sorts by code ascending.

// lib/nbu/kyivDate.ts
export function kyivDateString(date: Date): string;      // "DD.MM.YYYY" in Europe/Kyiv
export function isStaleRate(exchangeDate: string, now: Date): boolean;
  // both pure & total; `now`/`date` always passed in — no internal Date.now(),
  // per the project rule against implicit-clock / toISOString().slice(0,10) logic.

// lib/nbu/fetchTodayRates.ts — NOT pure (I/O), framework-free (TC-PURE-01:
  // only global fetch, no next/react import). Accepts { noStore? } so the
  // Server Component path can use Next's revalidate cache and the Route
  // Handler retry path can force a fresh fetch.
export type FetchRatesResult =
  | { ok: true; rates: Rate[]; exchangeDate: string }
  | { ok: false };
export async function fetchTodayRates(opts?: { noStore?: boolean }): Promise<FetchRatesResult>;
```

`kyivDateString` uses `Intl.DateTimeFormat` with `timeZone: "Europe/Kyiv"` —
the active locale's calendar, not the server's local clock or
`toISOString().slice(0,10)` (project rule, carried over from the `app-shell`/
`i18n` precedent of explicit, testable, timezone-aware date logic).

### 4. Caching — `NFR-PERF-01`

The Server Component's first-load fetch uses Next's `next: { revalidate: 3600
}` (NBU's source updates at most once per business day, so an hour is a
generous, NBU-friendly cadence — "cache the last successful response… until
the currency/date changes," interpreted as a time-boxed cache since there is
no per-request currency parameter yet). The Route Handler's retry path passes
`{ noStore: true }` to force a fresh fetch, since a retry is the user
explicitly asking for current data after a failure.

### 5. Empty NBU response treated as failure

If NBU ever returns a 200 with zero parseable rates, `fetchTodayRates`
returns `{ ok: false }` rather than `{ ok: true, rates: [] }` — an empty
"official rates" list is itself anomalous and should surface as a degraded
state (`NFR-OBS-01`), not silently render a blank list.

### 6. Focus panel for this slice

The right slot shows a minimal `CurrencyFocusPanel`: nothing selected → a
calm prompt (`uk.rates.selectPrompt`); selected → avatar, code, name, and the
official rate. This is a deliberately small real feature (not a placeholder)
that `converter` and `rate-history` extend in later slices.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| NBU response shape drifts (extra/missing fields) | `mapNbuRates` is defensive — unknown/malformed entries are dropped, not thrown; tested with malformed fixtures. |
| Hourly cache shows a slightly stale "today" rate mid-day after a late NBU publish | Acceptable — NBU itself publishes once; `AsOfBadge` always shows the *actual* `exchangeDate` from the response, so the UI never lies even if the cache is an hour old. |
| Retry route becomes an unkeyed proxy abused for scraping | Same risk profile as NBU's own public API (keyless already); no rate limit added in MVP (`NFR-COST-01` keeps the project key-free) — flagged, not blocking. |
| 45 unsorted currencies overwhelm the list before `currency-picker` ships | Accepted short-term; sorted by code at least gives predictable scanning; the picker slice follows immediately per the build order. |

## Migration Plan

1. `lib/nbu/mapRates.ts` + `kyivDate.ts` + tests (red → green) — pure logic first.
2. `lib/nbu/fetchTodayRates.ts` + a mocked-fetch test for the failure path.
3. `app/api/rates/route.ts` Route Handler.
4. `components/rates/{CurrencyRow,CurrencyFocusPanel,RatesView}.tsx` + `uk.rates.*` strings.
5. `app/page.tsx` → Server Component using `AppShell` + `RatesView`.
6. `npm run verify` green; hand off to checkers.
7. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Open Questions

- None blocking. Whether to add a popularity-ordered basket (vs. alphabetical)
  is deferred — `currency-picker`'s filter makes ordering less load-bearing.
