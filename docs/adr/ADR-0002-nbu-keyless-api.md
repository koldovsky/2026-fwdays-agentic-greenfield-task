# ADR-0002: Data source — National Bank of Ukraine (NBU) keyless open API

- **Status:** Accepted
- **Date:** 2026-06-29
- **Deciders:** orchestrator + user

## Context

«Гривня» needs official UAH exchange rates: today's rate per currency, and a
~30-day history per currency for the chart and the trend hint
([product-brief.md](../product-brief.md)). The course and
[ADR-0001](ADR-0001-stack.md) require a **public, keyless, free** source so the
app runs with zero secrets and zero cost. The source must be trustworthy and
on-brand for a Ukrainian-first app about Ukraine.

The **National Bank of Ukraine open data API** (`bank.gov.ua`) publishes the
**official** daily rate, requires no key, no registration, returns JSON, and is
the authoritative Ukrainian source. It is the natural fit.

## Decision

We will use the **NBU `NBUStatService` open API** as the **single** data source.
Confirmed endpoints (all keyless, `&json` for JSON):

- **All currencies, today:**
  `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json`
  → array of `{ r030, txt, rate, cc, exchangedate }` (e.g. `cc:"USD"`,
  `rate:41.8`, `exchangedate:"29.06.2026"`).
- **One currency, a specific date:**
  `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=YYYYMMDD&json`

For the **~30-day history**, the date-range endpoint shape will be **verified
live during the rate-history slice** (Stage 5–7, prompt 7) before coding against
it — the candidates are NBU's period endpoint
(`.../exchange_history?...` / `.../dynamic?...&date_start&date_end`) or, as a
guaranteed fallback, **iterating the confirmed dated endpoint** over the last ~30
business days. The slice picks whichever the live API actually serves; the spec
records the chosen shape.

**Rules of use:**

- All NBU calls happen in **Server Components / Route Handlers** (never expose
  the call as if a key were needed); responses are mapped to domain types in a
  framework-free `lib/nbu/` fetch wrapper using global `fetch` +
  `AbortSignal.timeout`.
- **Official daily rate only** — no interbank/market/intraday rates. The app
  reports one honest number.
- **Stale-data honesty:** on weekends/holidays NBU serves the previous business
  day's rate; the UI labels the actual `exchangedate`, never relabels it "today".
- **Attribution:** the footer credits the National Bank of Ukraine open data
  (carried into requirements as a `BC-*`).
- **Caching:** cache the last successful response in memory per session/request;
  re-fetch on currency/date change. No persistence.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| NBU open API (chosen) | Keyless, free, **official** Ukrainian source; JSON; on-brand; history available | Daily granularity only; weekend/holiday staleness must be handled |
| PrivatBank / Monobank public rates | Popular; near-real-time | Commercial/cash & interbank rates, not the official figure; less on-brand as the source of record; terms vary |
| exchangerate.host / openexchangerates | Many currencies, base switching | Needs a key (or is rate-limited/unreliable free); USD-based, not UAH-official; off-brand |
| ECB / Frankfurter | Reliable, keyless | EUR-based, no official UAH figure; wrong source of truth for this app |

## Consequences

- **Easier:** zero secrets, zero cost, one provider to learn; the "source of
  truth" question has an unambiguous, authoritative answer.
- **We accept:** daily (not intraday) data; explicit handling of stale
  weekend/holiday rates; a one-time live verification of the exact history
  endpoint before the history slice is coded.
- **Error/empty/loading surfaces (carried into requirements & the per-slice loop):**
  - network failure / non-200 / timeout → visible degraded state, never a 500 or blank;
  - unknown or unsupported currency code → inline "не знайдено", no toast;
  - a date with no published rate → honest empty state labelled with the date.
- **Follow-ups:** the `lib/nbu/` mapper + fetch wrapper and its fixture
  responses are authored in the currency-list slice; `kurs-uah` skill reuses the
  same endpoints standalone.
