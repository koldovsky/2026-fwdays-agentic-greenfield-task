# Data flow — «Гривня»

> Three request lifecycles: first load, list retry, and currency-history
> fetch. All three terminate at the same keyless NBU endpoint
> (`NBUStatService`, [ADR-0002](../adr/ADR-0002-nbu-keyless-api.md)) and
> never call it from the browser.

## 1. First load (today's rates)

```
Browser GET /
  -> app/page.tsx (Server Component, runs on the server)
       -> lib/nbu/fetchTodayRates.ts
            -> fetch(NBU "today" endpoint)        revalidate: 1h
            -> lib/nbu/mapRates.ts                  raw JSON -> Rate[]
       -> lib/nbu/kyivDate.ts: isStaleRate(exchangeDate, new Date())
       -> lib/sayings/selectSaying.ts (+ kyivDayOfYear)
  -> RatesView (Client Component), receives:
       initial: FetchRatesResult     (the mapped rates or {ok:false})
       initialStale: boolean
       saying: string
  -> renders the currency list immediately from `initial` — no client-side
     loading flash on first paint (confirmed via `npm run build`'s route
     summary: `/` is `○ Static`, prerendered).
```

`isStaleRate` and `selectSaying` are both computed exactly once, here, in
the one Server Component the app has — never recomputed client-side (see
"Hydration boundary" in [architecture.md](architecture.md)).

## 2. List retry (on fetch failure)

```
RatesView.tsx: result.ok === false
  -> renders `.rates-error` with a "Спробувати ще раз" button
  -> onClick: fetch("/api/rates")            (client -> own Route Handler)
       -> app/api/rates/route.ts
            -> lib/nbu/fetchTodayRates.ts     (same wrapper as first load)
       <- { ok, rates, exchangeDate } JSON, always 200
  -> setState(...) re-renders the list, or shows the error again
```

The browser never calls NBU directly — `/api/rates` is the only NBU-adjacent
URL the client ever sees (`TC-DATA-01`).

## 3. Currency history (on selecting a currency)

```
User clicks a currency row
  -> RatesView sets activeCode
  -> CurrencyFocusPanel renders Converter (sync, no fetch — uses the
     already-fetched `rate` prop) + CurrencyHistory (keyed by `code`,
     forces a full remount on currency switch — see design.md Decision 4
     in the archived rate-history change folder, "no manual cache, no
     cancellation-flag complexity needed because the key forces a
     guaranteed-fresh mount instead").
  -> CurrencyHistory.tsx useEffect on mount:
       fetch(`/api/history?code=${code}`)
         -> app/api/history/route.ts
              -> lib/nbu/fetchHistory.ts
                   -> lib/nbu/historyWindow.ts   (computes ~30-day range)
                   -> fetch(NBU range endpoint, or per-day fallback)
                   -> lib/nbu/mapHistory.ts       raw JSON -> HistoryPoint[]
       <- { ok, points } JSON, always 200
  -> state: loading | error | empty | ready
       ready  -> TrendHint (lib/currency/weeklyMove + trendSentence)
                 + HistoryChart (Recharts, real npm import per ADR-0004)
       error  -> "Спробувати ще раз" (added Stage 10 — see
                 docs/qa/risk-register.md R-06)
       empty  -> honest "no data for this period" message
```

## Caching

| Route | Type | Revalidate |
|---|---|---|
| `/` | Static (prerendered) | 1 hour |
| `/api/rates` | Dynamic | none (always fresh — explicit retry should be a real retry) |
| `/api/history` | Dynamic | none |

Confirmed via `next build`'s own route summary, reproduced on every
`npm run verify` run — not asserted from memory.

## Failure handling (NFR-OBS-01, applies identically at every fetch above)

Every NBU call is wrapped to return `{ ok: false }` rather than throw —
`fetchTodayRates.ts` and `fetchHistory.ts` both catch network errors,
non-2xx responses, and malformed JSON into the same envelope shape. Every
consumer (`RatesView.tsx`, `CurrencyHistory.tsx`) branches on `ok` into a
visible, calm, Ukrainian message with a retry action — never a blank panel,
never an uncaught exception reaching the browser console.
