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

We will use the **NBU open API** as the **single** data source. Endpoints
(all keyless, `&json` for JSON) — **verified live 2026-06-30** while building the
`kurs-uah` skill:

- **All currencies, today:**
  `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json`
  → array of `{ r030, txt, rate, cc, exchangedate, special }` (`cc` = ISO code,
  `txt` = Ukrainian name, `rate` = ₴ per unit, `exchangedate` = `DD.MM.YYYY`).
- **All currencies on a given date** (archive — repeats the last business day on
  weekends/holidays): `…/statdirectory/exchange?date=YYYYMMDD&json`.
- **One currency on a date:** `…/statdirectory/exchange?valcode=USD&date=YYYYMMDD&json`.
- **~30-day history (range)** — the resolved history endpoint (ADR-0002's prior
  open question, now **closed**):
  `https://bank.gov.ua/NBU_Exchange/exchange_site?start=YYYYMMDD&end=YYYYMMDD&valcode=USD&sort=exchangedate&order=desc&json`
  → array of daily `{ exchangedate, cc, txt, rate, units, rate_per_unit, calcdate, … }`.
  (Weekends/holidays carry the prior business day's `rate` with that `exchangedate` —
  confirmed in the response, so `rate-history` must de-duplicate or label accordingly.)

The `rate-history` slice uses the **range endpoint** above; the dated archive
endpoint remains a guaranteed per-day fallback.

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
