# Design: Availability resilience

## Prefetch

`prefetchTennisAvailability()` default `dayCount` → **1** (tomorrow only). Other dates load on tab click via existing When-step lazy fetch.

## Scraper

New `scrapeAllCourtsForDate(page, date)`:

1. Select first court + navigate calendar once (`selectTennisDate`)
2. Read East slots
3. Switch court `<select>` only; re-read West slots

Halves calendar navigation per API call.

## Errors

`friendlyAvailabilityError(message)` maps:

| Pattern | User message |
|---------|--------------|
| calendar day link timeout | MHOA calendar slow or date not open — try again or Schedule later |
| generic timeout | MHOA took too long — try again |
| other | Short generic fallback |

## Cache

`availability-cache.ts`: cache only `status: "ok"`. Export `retryTennisAvailability(date)` that clears inflight + cache entry then refetches.

## UI

`AvailabilityPanel`: optional `onRetry` button when `status === "error"`.

## API budget

`fetchTennisAvailabilityLive` wrapped in `Promise.race` with 90s timeout → friendly error.
