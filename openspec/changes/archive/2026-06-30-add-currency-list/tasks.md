## 1. Pure NBU mapping + date helpers (tests first)

- [x] 1.1 Write `lib/nbu/mapRates.test.ts` against the not-yet-existing
      `./mapRates` (`@trace FR-RATES-02`): valid array maps correctly and sorts
      by code; non-array input → `[]`; entries missing `cc`/`txt`/`rate`/
      `exchangedate` or with non-finite `rate` are dropped, not thrown. Observe **RED**.
- [x] 1.2 Add `lib/nbu/mapRates.ts`. Run until **GREEN**.
- [x] 1.3 Write `lib/nbu/kyivDate.test.ts` (`@trace FR-RATES-03`): `kyivDateString`
      formats a known UTC `Date` as `DD.MM.YYYY` in `Europe/Kyiv`; `isStaleRate`
      true when `exchangeDate !== kyivDateString(now)`, false when equal. Observe **RED**.
- [x] 1.4 Add `lib/nbu/kyivDate.ts`. Run until **GREEN**.

## 2. Fetch wrapper (mocked-fetch tests)

- [x] 2.1 Write `lib/nbu/fetchTodayRates.test.ts` (`@trace FR-RATES-05`): stub
      `globalThis.fetch` — non-200 → `{ ok: false }`; thrown/rejected fetch →
      `{ ok: false }`; malformed/empty JSON → `{ ok: false }`; valid JSON →
      `{ ok: true, rates, exchangeDate }`. Observe **RED**.
- [x] 2.2 Add `lib/nbu/fetchTodayRates.ts` (`TC-DATA-01`: global `fetch` only,
      no `next`/`react` import; `{ noStore? }` option). Run until **GREEN**.

## 3. Route Handler

- [x] 3.1 `app/api/rates/route.ts` — `GET`, calls `fetchTodayRates({ noStore: true })`,
      returns JSON; the only client-reachable path to fresh NBU data (`TC-DATA-01`).

## 4. Components

- [x] 4.1 Add `uk.rates.*` strings to `lib/i18n/uk.ts` (load error, retry label,
      empty-selection prompt) — no inline literals (`FR-I18N-01`).
- [x] 4.2 `components/rates/CurrencyRow.tsx` — `CurrencyAvatar` (DS) + code/name/
      rate, uk-UA tabular mono; no trend pill (design.md Decision 2). Native
      `<button>`, `aria-pressed` for selection state.
- [x] 4.3 `components/rates/CurrencyFocusPanel.tsx` — empty prompt or selected
      summary (`FR-RATES-04`).
- [x] 4.4 `components/rates/RatesView.tsx` (client) — owns `activeCode` +
      `result`/`loading` state; renders the list + `AsOfBadge` (stale via
      `isStaleRate`) in the left slot, `CurrencyFocusPanel` in the right slot;
      on `result.ok === false`, an inline calm error with a retry button that
      calls `/api/rates` and re-enters `AppShell`'s `loading` skeleton meanwhile.

## 5. Page integration

- [x] 5.1 `app/page.tsx` → Server Component: `fetchTodayRates()` at request
      time (default `next.revalidate`), passes the result into `RatesView`.
      Removes the `app-shell` placeholder panels and the artificial
      `setTimeout` loading demo.

## 6. Eval case

- [x] 6.1 Add `evals/cases/currency-list.eval.ts` — rubric: stale-date honesty
      wording; calm inline error copy (no toast, no exclamation marks);
      rate readability (tabular mono, uk-UA); no fabricated trend on rows.

## 7. Verification

- [x] 7.1 `npm run test:run` — all unit tests green.
- [x] 7.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 7.3 Tick all tasks above; update `docs/current-state.md` for maker handoff.
