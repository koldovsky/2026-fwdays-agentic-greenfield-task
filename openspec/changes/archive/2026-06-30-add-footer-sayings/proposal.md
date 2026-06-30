## Why

The baseline spec at `openspec/specs/footer-sayings/spec.md` defines
**FR-SAYINGS-01** (Future-phase, promotable to MVP): a deterministic
day-of-year Ukrainian money one-liner in the footer, no API, no tracking.
With all 25 MVP FRs now implemented (`app-shell` through `trend-hint`), this
small leaf capability is in scope to finish the optional flavour and close
out Stage 5.

## What Changes

- Add `lib/sayings/sayings.ts`: a fixed, pure array of calm Ukrainian
  money-themed one-liners (no exclamation marks).
- Add `lib/sayings/selectSaying.ts`: pure, deterministic day-of-year
  selection (`dayOfYear % sayings.length`), using the Kyiv calendar (not the
  server's local clock).
- Extend `lib/nbu/kyivDate.ts` with `kyivDayOfYear` (reuses the existing
  Kyiv-timezone extraction already used by `kyivDateString`/`kyivYmd`).
- Thread the resolved saying as a prop from `app/page.tsx` (the true Server
  Component boundary) through `RatesView` → `AppShell` → `AppFooter` —
  computed once server-side with `new Date()`, exactly like `initialStale`,
  to avoid a hydration mismatch (`AppFooter` is reached through the client
  boundary at `RatesView`, so it is not safe to call `new Date()` inside it
  directly).

## Capabilities

### New Capabilities

- `footer-sayings`: first implementation of the baseline spec
  (FR-SAYINGS-01). Delta spec mirrors `openspec/specs/footer-sayings/spec.md`
  without behavioural change.

### Modified Capabilities

<!-- None — AppFooter's existing provenance line is unchanged; the saying is
     an addition, not a replacement. -->

## Impact

| Area | Change |
| --- | --- |
| **`lib/sayings/sayings.ts`** | New pure data module: the one-liner corpus. |
| **`lib/sayings/selectSaying.ts`** | New pure helper: deterministic selection by Kyiv day-of-year. |
| **`lib/nbu/kyivDate.ts`** | Extended (not replaced) with `kyivDayOfYear`; existing exports/tests untouched. |
| **`app/page.tsx`** | Computes `saying` once, server-side. |
| **`components/rates/RatesView.tsx`** | New `saying: string` prop, passed to both `<AppShell>` call sites (success and error branches). |
| **`components/app-shell/AppShell.tsx`** | New `footerSaying?: string` prop, passed to `<AppFooter>`. |
| **`components/app-shell/AppFooter.tsx`** | Renders the saying below the existing provenance line. |
| **Dependencies** | None — independent of all other slices. Leaf capability. |
