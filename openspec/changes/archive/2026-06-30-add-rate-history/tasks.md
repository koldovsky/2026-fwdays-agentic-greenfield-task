## 1. Kyiv date helpers — extend, don't replace (tests first)

- [x] 1.1 Write tests for `kyivYmd` and `addKyivDays` in `lib/nbu/kyivDate.test.ts`
      (`@trace FR-HISTORY-02`): `kyivYmd` formats `YYYYMMDD` in Europe/Kyiv;
      `addKyivDays` subtracts/adds whole calendar days correctly across a
      month and a year boundary (e.g. 2026-01-05 minus 10 days), immune to
      DST (UTC-anchored calendar arithmetic). Confirm existing
      `kyivDateString`/`isStaleRate` tests still pass unmodified. Observe
      **RED** for the two new exports.
- [x] 1.2 Extend `lib/nbu/kyivDate.ts` with `kyivYmd` + `addKyivDays`, sharing
      the existing `kyivParts` Kyiv-timezone extraction. Run until **GREEN**
      (all kyivDate tests, old and new).

## 2. Pure history window + mapping (tests first)

- [x] 2.1 Write `lib/nbu/historyWindow.test.ts` (`@trace FR-HISTORY-02`):
      a fixed `now` produces the expected `{start, end}` `YYYYMMDD` pair for
      the default ~30-day window; a custom `days` override works. Observe **RED**.
- [x] 2.2 Add `lib/nbu/historyWindow.ts`. Run until **GREEN**.
- [x] 2.3 Write `lib/nbu/mapHistory.test.ts` (`@trace FR-HISTORY-01`): valid
      range-endpoint fixtures (incl. consecutive carry-over duplicate rates)
      map correctly and stay sorted ascending by date even if the input is
      descending or out of order; malformed/missing-field entries are
      dropped, not thrown; non-array input → `[]`. Observe **RED**.
- [x] 2.4 Add `lib/nbu/mapHistory.ts`. Run until **GREEN**.

## 3. Fetch wrapper (mocked-fetch tests)

- [x] 3.1 Write `lib/nbu/fetchHistory.test.ts` (`@trace FR-HISTORY-02`,
      `FR-HISTORY-03`): stub `globalThis.fetch` — non-200 / reject / malformed
      JSON / empty array all resolve `{ ok: false }`; valid JSON resolves
      `{ ok: true, points }`; the requested URL contains the `start`/`end`
      window computed from an injected `now` and the given `code`. Observe **RED**.
- [x] 3.2 Add `lib/nbu/fetchHistory.ts`. Run until **GREEN**.

## 4. Route Handler

- [x] 4.1 `app/api/history/route.ts` — `GET`, reads `?code=`, calls
      `fetchHistory(code)`, returns JSON; missing `code` → `{ ok: false }`
      (`TC-DATA-01`).

## 5. Chart + state machine components

- [x] 5.1 `components/rates/HistoryChart.tsx` — real `recharts` import (ADR-0004),
      visually matching the vendored `RateChart.jsx` (gradient area, brand
      colour, mono tabular ticks/tooltip, `isAnimationActive={false}`, padded
      y-domain per `FR-HISTORY-04`).
- [x] 5.2 `components/rates/CurrencyHistory.tsx` — `loading → ready | empty | error`
      state machine; fetches `/api/history?code=` on mount; loading shows a
      skeleton of comparable footprint; empty/error are calm inline messages
      (no toast, no raw error text — `NFR-OBS-01`).
- [x] 5.3 Add `uk.history.*` strings (empty message, error message) — no
      inline literals (`FR-I18N-01`).

## 6. Integration

- [x] 6.1 `CurrencyFocusPanel.tsx` renders
      `<CurrencyHistory key={rate.code} code={rate.code} />` below the
      `Converter` — remounts (fresh fetch) on currency change, no manual
      cache needed (design.md Decision 4).

## 7. Eval case

- [x] 7.1 Add `evals/cases/rate-history.eval.ts` — rubric: chart readability
      (mono tabular tooltip, calm gradient, no theatrical animation);
      honest y-domain (small moves don't look dramatic); calm empty/error
      copy; loading never reads as blank/broken.

## 8. Verification

- [x] 8.1 `npm run test:run` — all unit tests green.
- [x] 8.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 8.3 Tick all tasks above; update `docs/current-state.md` for maker handoff.
