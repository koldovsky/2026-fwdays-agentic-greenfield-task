## Why

The baseline spec at `openspec/specs/rate-history/spec.md` defines
**FR-HISTORY-01 … FR-HISTORY-04**: a ~30-day line of the active currency's
official UAH rate, fetched server-side from NBU's range endpoint (verified
live, [ADR-0002](../../docs/adr/ADR-0002-nbu-keyless-api.md)), with honest
loading/empty/error states and a padded y-domain. Depends on `currency-list`
(the active-currency selection it charts) and `i18n`.

## What Changes

- Add `lib/nbu/mapHistory.ts`: pure mapper for the range endpoint's distinct
  response shape (`{ exchangedate, cc, rate, units, rate_per_unit, calcdate,
  … }` — different fields from `mapRates.ts`'s "today" endpoint).
- Add `lib/nbu/historyWindow.ts`: pure `~30`-day window calculation (Kyiv
  calendar, `now` injected — extends `kyivDate.ts` with `kyivYmd` +
  `addKyivDays`, reused by both window calculation and any future date math).
- Add `lib/nbu/fetchHistory.ts`: fetch wrapper for the range endpoint, server-only.
- Add `app/api/history/route.ts`: a Route Handler (`GET ?code=`) — history
  depends on the *client-selected* active currency, so (unlike `currency-list`'s
  page-load SSR fetch) this must be fetched after selection; the Route Handler
  keeps the NBU call server-side regardless (`TC-DATA-01`).
- Add `components/rates/HistoryChart.tsx`: a real `recharts`-powered line
  chart (see **ADR-0004** — npm import, not the vendored UMD-global
  `RateChart.jsx`), visually matching the vendored design (gradient area,
  brand colour, mono tabular ticks/tooltip, padded y-domain).
- Extend `CurrencyFocusPanel` to fetch and render history when a currency is
  active: loading skeleton, honest empty state, calm inline error — never
  blank or a crash.

## Capabilities

### New Capabilities

- `rate-history`: first implementation of the baseline spec
  (FR-HISTORY-01 … FR-HISTORY-04). Delta spec mirrors
  `openspec/specs/rate-history/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — currency-list's selection contract is reused, not changed. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/nbu/kyivDate.ts`** | Extended (not replaced): adds `kyivYmd` + `addKyivDays`, sharing the existing `kyivParts` Kyiv-timezone extraction. Existing `kyivDateString`/`isStaleRate` behaviour and tests untouched. |
| **`lib/nbu/historyWindow.ts`** | New pure helper: `~30`-day `{start,end}` window in `YYYYMMDD`, `now` injected. |
| **`lib/nbu/mapHistory.ts`** | New pure mapper for the range endpoint, total, never throws, sorted ascending by date. |
| **`lib/nbu/fetchHistory.ts`** | New fetch wrapper (range endpoint), server-only, mirrors `fetchTodayRates.ts`'s never-throw contract. |
| **`app/api/history/route.ts`** | New Route Handler — the only client-reachable path to history data. |
| **`components/rates/HistoryChart.tsx`** | New — real `recharts` import (ADR-0004), not the vendored `window.Recharts` component. |
| **`components/rates/CurrencyFocusPanel.tsx`** | Extended: fetches history on `rate.code` change; renders `HistoryChart` / loading / empty / error. |
| **`package.json`** | Adds `recharts` as a real dependency (ADR-0004). |
| **Dependencies** | `currency-list` (active currency), `i18n`. Downstream: `trend-hint` will read the same history data this slice fetches. |
