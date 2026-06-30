## Why

The baseline spec at `openspec/specs/currency-list/spec.md` defines
**FR-RATES-01 … FR-RATES-05**: fetch today's official NBU rates server-side,
render them with honest provenance, and let the user select a currency. This is
the first slice that talks to the live NBU API, depending on `app-shell` (the
shell slots it renders into) and `i18n` (the string table it adds to). It is
also the first slice to exercise `TC-DATA-01` (NBU calls server-side only) and
`BC-HONESTY-01` (stale-date labelling) for real.

## What Changes

- Add `lib/nbu/`: pure mapping + date-staleness helpers, and a fetch wrapper
  that calls the NBU "all currencies, today" endpoint (verified live in
  ADR-0002 / the `kurs-uah` skill) server-side only.
- Add a Route Handler `app/api/rates` so a client-triggered retry can re-fetch
  without ever calling NBU from the browser.
- Convert `app/page.tsx` to a Server Component that fetches the rates once at
  request time and hands them to a new client `RatesView`.
- Render the rates list in the shell's left slot (`CurrencyRow` × N, reusing
  `@/components/ds`'s `CurrencyAvatar`) and a selection summary in the right
  slot (`CurrencyFocusPanel`) — replacing the `app-shell` slice's placeholder
  panels and its artificial loading-skeleton demo with real data-driven states.
- Show the effective date via `@/components/ds`'s `AsOfBadge`, honestly labelled
  stale on weekends/holidays (`BC-HONESTY-01`).
- On fetch failure, show a calm inline error with a retry action — never a 500
  or blank screen (`NFR-OBS-01`).
- New `uk.rates.*` strings added to `lib/i18n/uk.ts` (no inline literals).

## Capabilities

### New Capabilities

- `currency-list`: first implementation of the baseline spec
  (FR-RATES-01 … FR-RATES-05). Delta spec mirrors
  `openspec/specs/currency-list/spec.md` without behavioural change.

### Modified Capabilities

<!-- None — app-shell's slot contract (left/right ReactNode, loading prop) is
     reused as designed; no behavioural change to its own FRs. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/nbu/`** | `mapRates.ts` (NBU JSON → domain `Rate[]`, total, never throws), `kyivDate.ts` (Kyiv-timezone date formatting + staleness, pure, `now` injected), `fetchTodayRates.ts` (fetch wrapper; `next.revalidate` by default, `no-store` on forced retry). |
| **`app/api/rates/route.ts`** | New Route Handler — GET, calls `fetchTodayRates({ noStore: true })`, returns JSON. The only client-reachable path to fresh NBU data. |
| **`app/page.tsx`** | Becomes a Server Component: fetches once, passes to `RatesView`. |
| **`components/rates/`** | `RatesView` (client: selection state, retry), `CurrencyRow` (list row, no fabricated trend), `CurrencyFocusPanel` (right-slot summary). |
| **`lib/i18n/uk.ts`** | New `rates` group: load error, retry label, empty-selection prompt, as-of wording handled by `AsOfBadge` itself. |
| **`@/components/ds`** | Reuses `CurrencyAvatar`, `AsOfBadge`. Does **not** reuse `RateRow` (see design.md Decision 2 — it bundles a trend pill this slice has no honest data for). |
| **Dependencies** | `app-shell` (shell slots), `i18n` (string table). Downstream: `currency-picker` filters this list; `converter`/`rate-history`/`trend-hint` extend the focus panel. |
