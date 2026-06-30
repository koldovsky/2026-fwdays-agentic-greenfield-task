## Context

- Baseline spec: `openspec/specs/currency-picker/spec.md` (FR-PICK-01 … FR-PICK-03).
- `currency-list` (built) already renders `result.rates` as `CurrencyRow[]` in
  `RatesView`'s left slot, with `activeCode` selection state and an `AsOfBadge`
  above the rows.
- The vendored `@/components/ds`'s `CurrencyPicker` exists but is not reused
  (see proposal.md "Not reused" — it bundles `RateRow`'s fabricated trend pill
  and hardcodes strings that don't match this spec's exact wording).

## Goals / Non-Goals

**Goals:**

- One search input filters the already-rendered rows by code or name,
  case-insensitive substring match.
- Exact spec wording «Нічого не знайдено» on a non-empty query with zero
  matches — inline, not a toast.
- Selecting from the filtered results uses the existing selection wiring
  unchanged.

**Non-Goals:**

- No debounce — the list is already in memory (no network call per keystroke),
  so a synchronous filter has no perceptible cost at ~45 rows.
- No fuzzy/typo-tolerant matching — plain substring, consistent with the
  spec's scenario text ("«USD» (or «дол»)" — exact substrings of code/name).
- No change to `AsOfBadge` or the error/retry states — the filter only affects
  the rows.

## Decisions

### 1. Pure `filterRates`, thin UI

```ts
// lib/currency/filterRates.ts
export function filterRates(rates: Rate[], query: string): Rate[];
```

Total, never throws (string ops only), case-insensitive substring match
against both `code` and `name`. Empty/whitespace-only query returns the full
list unfiltered — distinguishing "no query yet" from "query matched nothing"
is what decides whether the empty-result message shows (Decision 2).

### 2. Empty-result condition

The «Нічого не знайдено» message shows only when **both** are true: the
trimmed query is non-empty, and the filtered result is empty. An empty query
always shows the full list — it is never itself an "empty result."

```ts
const trimmed = query.trim();
const showEmpty = trimmed.length > 0 && filteredRates.length === 0;
```

### 3. No new component — filter lives in `RatesView`

The filter is one `Input` (from `@/components/ds`) plus a `query` state and
the `filterRates` call, all within the existing `RatesView`. No separate
`CurrencyFilter.tsx` wrapper: there is no behaviour to encapsulate beyond the
already-extracted pure function, and `RatesView` is already the slice's
client orchestrator (selection, retry) — adding query state follows the same
pattern, not a new one.

### 4. Don't reuse vendored `CurrencyPicker`

Reaffirms `currency-list`'s Decision 2 precedent: vendored components that
bundle behaviour this slice doesn't have honest data for (trend pills) or
hardcode non-spec copy are not reused wholesale. `CurrencyRow` (already
built) is reused; the vendored `CurrencyPicker`'s `Input` + filter shape is
the *pattern* borrowed, not the component itself.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Filtering on every keystroke re-renders ~45 rows | Negligible at this scale; no debounce needed (documented as a non-goal, not an oversight). |
| Empty-query vs. empty-result ambiguity | Explicit `trimmed.length > 0` guard (Decision 2) — tested directly. |

## Migration Plan

1. `lib/currency/filterRates.ts` + tests (red → green).
2. Add `uk.picker.*` strings.
3. Wire `query` state + `Input` + the filtered/empty branch into `RatesView`.
4. `npm run verify` green; hand off to checkers.
5. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Open Questions

None blocking.
