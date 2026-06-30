## Context

- Baseline spec: `openspec/specs/rate-history/spec.md` (FR-HISTORY-01 … FR-HISTORY-04).
- Range endpoint shape (verified live, ADR-0002), **distinct** from
  `currency-list`'s "today" endpoint:
  `{ exchangedate, r030, cc, txt, enname, rate, units, rate_per_unit, group, calcdate, special }`.
  Re-verified live while scoping this slice (2026-06-30, USD, 01–30.06.2026):
  consecutive weekend/holiday days carry the prior business day's `rate`,
  confirming ADR-0002's note.
- **Chart delivery mechanism changed** — see [ADR-0004](../../docs/adr/ADR-0004-recharts-npm-not-umd.md):
  `recharts` is a real npm dependency now; `HistoryChart.tsx` is a fresh
  component, not the vendored `window.Recharts`-based `RateChart.jsx`.
- `currency-list`/`currency-picker` already established: don't reuse a
  vendored DS component wholesale when it doesn't fit this app's real data or
  delivery constraints (`RateRow`, `CurrencyPicker`, and now `RateChart`).

## Goals / Non-Goals

**Goals:**

- A real, reliably-rendering ~30-day line chart for the active currency.
- Server-only NBU calls for history too (`TC-DATA-01`), via a Route Handler
  (history depends on *client-selected* state, unlike `currency-list`'s
  page-load SSR fetch).
- Honest loading/empty/error states around the chart (`FR-HISTORY-03`).
- Padded y-domain so small moves don't read as dramatic swings (`FR-HISTORY-04`).

**Non-Goals:**

- No client-side caching layer beyond the natural per-currency remount (see
  Decision 4) — no manual `Map<code, points>` cache for MVP.
- No retry button on history failure (unlike `currency-list`'s retry) —
  re-selecting the currency (or any currency) naturally re-fetches; a
  separate retry affordance is deferred as non-essential polish.
- No change to the "today" rate displayed above the chart — that remains
  `currency-list`'s concern.

## Decisions

### 1. Honest charting of carry-over values — no de-duplication needed

ADR-0002 flagged that the range endpoint "must de-duplicate or label"
weekend/holiday carry-over rows. For the **single "as of" badge** in
`currency-list`, that mattered (showing a carried-over rate as "today" would
be dishonest). For a **chart**, plotting the actual daily values — including
several consecutive equal values — **is** the honest representation: the
official rate genuinely did not change those days. No de-duplication is
applied; `mapNbuHistory` keeps one point per `exchangedate` as returned.

### 2. Server-side fetch via a dedicated Route Handler

Unlike `currency-list` (SSR fetch at page-load, since "today's rates" needs
no input), the history endpoint needs the **active currency**, which is
client-side state set after selection. `app/api/history/route.ts` (`GET
?code=`) keeps the NBU call server-only (`TC-DATA-01`) while letting the
client request history when a currency becomes active.

### 3. Pure window/mapping, separate from the fetch wrapper (established pattern)

```ts
// lib/nbu/kyivDate.ts — extended, not replaced
export function kyivYmd(date: Date): string;       // "YYYYMMDD" in Europe/Kyiv
export function addKyivDays(date: Date, delta: number): Date;
  // Calendar-only arithmetic anchored at UTC midnight of the Kyiv calendar
  // date (extracted once via the existing Intl formatter) — never touches
  // the server's local timezone, so it's correct regardless of host TZ.

// lib/nbu/historyWindow.ts
export function historyWindow(now: Date, days?: number): { start: string; end: string };
  // YYYYMMDD start/end for the NBU range query. Pure, total, `now` injected.

// lib/nbu/mapHistory.ts
export type HistoryPoint = { label: string; rate: number; exchangeDate: string };
export function mapNbuHistory(raw: unknown): HistoryPoint[];
  // Total, never throws, drops malformed entries, sorted ascending by date
  // (re-sorted defensively — never assumes the API's own ordering held).

// lib/nbu/fetchHistory.ts — I/O, framework-free, mirrors fetchTodayRates.ts
export async function fetchHistory(code: string, now?: Date): Promise<FetchHistoryResult>;
```

`kyivDateString`/`isStaleRate`'s existing behaviour and tests are untouched —
the new exports share the existing `kyivParts` Kyiv-timezone extraction
rather than re-implementing it.

### 4. Per-currency remount instead of a manual cache

`CurrencyFocusPanel` already remounts `Converter` via `key={rate.code}` when
the active currency changes (`converter`'s design.md Decision 3). The new
`CurrencyHistory` component follows the same pattern: `<CurrencyHistory
key={rate.code} code={rate.code} />`. Because the key forces a full
unmount/remount on every currency switch, the component's own `useEffect`
fetch always runs exactly once per mount with no possibility of `code`
changing under it mid-flight — so no cancellation-flag/race-guard logic is
needed; adding one would be unreachable complexity, not defensive value. This
intentionally satisfies the spirit of `NFR-PERF-01` ("cache… until the
currency changes") without a manual cache: switching back to a
previously-viewed currency simply re-fetches, which is acceptable for MVP
scope (non-goal: explicit caching).

### 5. Visual parity with the vendored design, via real recharts

`HistoryChart.tsx` matches `RateChart.jsx`'s look exactly: brand-coloured
area with a soft gradient wash, calm `var(--border-subtle)` grid, mono
tabular axis ticks and tooltip value, `isAnimationActive={false}` (the
project's "chart animation off by default — honest, not theatrical" rule,
DESIGN.md), and the same padded y-domain formula
(`pad = max((max-min)*0.35, max*0.004)`) satisfying `FR-HISTORY-04`.

### 6. Loading / empty / error states

`CurrencyHistory` is a small state machine: `loading → ready | empty | error`.
- **loading:** a skeleton block (reuses the existing calm-pulse pattern from
  `ShellSkeleton`'s CSS, sized for the chart's footprint) — never a blank gap.
- **empty:** the range endpoint resolved but returned zero points — an honest
  inline message, not hidden.
- **error:** fetch failure / non-200 / timeout — calm inline message, no toast,
  no raw error text (`NFR-OBS-01`).

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| `recharts` v3 API drift vs. the vendored kit's (implicit v2-era) usage | `HistoryChart.tsx` is written fresh against the installed v3 API and type-checked by `tsc` during `npm run build` — any incompatibility is a compile error, not a silent runtime gap. |
| Bundle size growth from a real charting library | Accepted per ADR-0004; scoped to the route that renders it (Next code-splits per page/route). |
| Kyiv calendar-day arithmetic edge cases (DST, year boundaries) | `addKyivDays` operates on a UTC-anchored calendar date (Y/M/D only, no time-of-day), making it immune to DST shifts; tested at a year boundary. |

## Migration Plan

1. `lib/nbu/kyivDate.ts` extension (`kyivYmd`, `addKyivDays`) + tests for the
   new exports (existing tests untouched) — red → green.
2. `lib/nbu/historyWindow.ts` + tests — red → green.
3. `lib/nbu/mapHistory.ts` + tests (realistic range-endpoint fixtures,
   including carry-over duplicates) — red → green.
4. `lib/nbu/fetchHistory.ts` + mocked-fetch tests (mirrors `fetchTodayRates.test.ts`'s coverage).
5. `app/api/history/route.ts`.
6. `components/rates/HistoryChart.tsx` (real `recharts` import).
7. `components/rates/CurrencyHistory.tsx` (loading/empty/error state machine + fetch).
8. Wire `<CurrencyHistory key={rate.code} code={rate.code} />` into `CurrencyFocusPanel`.
9. `npm run verify` green; hand off to checkers.
10. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Open Questions

None blocking. ADR-0004 records the one real architectural decision this
slice required.
