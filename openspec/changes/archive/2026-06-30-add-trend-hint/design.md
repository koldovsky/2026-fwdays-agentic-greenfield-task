## Context

- Baseline spec: `openspec/specs/trend-hint/spec.md` (FR-TREND-01 … FR-TREND-03).
- `rate-history` already fetches and holds `HistoryPoint[]` (ascending by
  date, ~30 daily points) inside `CurrencyHistory`'s `ready` state. The 7-day
  move is a read over data already in hand — no new endpoint, no new NBU call.
- `trendTone` (vendored, `components/ds/rates/TrendBadge.jsx`) is the
  project's existing single source of truth for up/down/flat classification,
  already reused by nothing yet in this app (the `currency-list` slice
  deliberately avoided the *visual* `TrendBadge` because it had no real data
  to feed it — this slice is what finally supplies that data honestly).

## Goals / Non-Goals

**Goals:**

- Compute the 7-day move from already-fetched history — zero new network calls.
- One calm Ukrainian sentence, no exclamation marks, leading with the
  direction + magnitude (`BC-BRAND-01`).
- `trendTone` (the existing single source of truth) decides up/down/flat —
  not a re-implemented or divergent copy.
- ±0.05% reads as flat, matching `trendTone`'s own default `flatBand`.

**Non-Goals:**

- No grammatically-declined Ukrainian currency names in the sentence (see
  Decision 1 — a real, deliberate scope cut, not an oversight).
- No separate loading/error state machine for the hint — it rides on
  `CurrencyHistory`'s existing states (Decision 3).
- No historical trend beyond 7 days (the spec is explicitly "7-day move").

## Decisions

### 1. The sentence subject is the ISO code, not the declined Ukrainian name

The spec's example — «Долар за тиждень зміцнів на 1,2% до гривні» — uses the
Ukrainian currency *name*, which requires the verb (`зміцнів`/`послабшав`) to
grammatically agree with that name's **gender** (masculine «долар» →
`зміцнів`; feminine «крона» → `зміцніла`; neuter «євро» → `зміцніло`) — and a
fully correct sentence would also need the name in the **genitive case** if
restructured around «курс». Building a complete Ukrainian gender/declension
table for the ~45 NBU currency names is real, disproportionate scope for one
sentence in an MVP slice.

**Chosen:** use the ISO code as the subject — «USD за тиждень зміцнів на
1,2% до гривні.» Currency-code-as-subject with a (conventionally masculine)
verb is a normal, natural register in Ukrainian financial text (codes/tickers
are read as abbreviations, not declined), and it is consistent with the
project's own existing rule that currency codes stay Latin everywhere
(`DESIGN.md`). The spec's scenario text says a sentence "**like**" the
example is shown — not byte-exact — so this satisfies the requirement's
intent without the grammar-table scope.

**Rejected:** (a) full per-currency gender/declension table — correct but
disproportionate; (b) a generic ungendered phrasing that drops the subject
entirely (e.g. «За тиждень — зміцнення на 1,2% до гривні») — reads stiffer
and loses the "lead with the currency" framing the spec's example has.

### 2. `weeklyMove` and `trendSentence` stay pure; `trendTone` is consumed at the component layer

```ts
// lib/currency/weeklyMove.ts — pure, total
export function weeklyMovePct(points: { rate: number }[]): number | null;
  // null when fewer than 8 points (no valid "7 days ago" comparison point) —
  // FR-TREND-01's "WHEN ... has at least a 7-day history" implies the
  // inverse case simply doesn't trigger the requirement; TrendHint renders
  // nothing rather than an error (see Decision 3).

// lib/currency/trendSentence.ts — pure, total
export type Tone = "up" | "down" | "flat";
export function trendSentence(code: string, deltaPct: number, tone: Tone): string;
  // Reads lib/i18n/uk.ts's `trend.*` templates — no inline literals.
```

Neither file imports `trendTone` directly: although `trendTone` itself never
touches React/DOM at runtime, it is defined in `TrendBadge.jsx`, a file whose
*top-level* imports include `react` and the `Icon` component — importing
that file from `lib/` would violate `TC-PURE-01`'s literal "no `next/*`,
no `react`" rule even though the specific function is pure. Instead,
`components/rates/TrendHint.tsx` (a regular client component, where
`@/components/ds` imports are already the norm — `CurrencyAvatar`,
`AsOfBadge`, `Input`, `Converter`) calls `trendTone(deltaPct)` and passes the
result into the pure `trendSentence`. This is genuine reuse of the single
source of truth (`FR-TREND-03`), not a duplicated copy that could drift.

### 3. No parallel fetch or state machine — extend `CurrencyHistory`

`TrendHint` takes `points: HistoryPoint[]` as a prop; it does not fetch
anything itself. `CurrencyHistory.tsx`'s existing `ready` branch renders
`<TrendHint code={code} points={state.points} />` above `<HistoryChart>` —
reusing the same fetch, the same loading/empty/error handling, no new states
to keep in sync. When `weeklyMovePct` returns `null` (insufficient history),
`TrendHint` renders nothing — quiet omission, not an error, consistent with
`NFR-OBS-01`'s "never alarm, never crash" without inventing a fourth state.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Code-as-subject reads slightly less polished than a fully-declined name | Accepted trade-off (Decision 1); revisit only if a future slice budgets real Ukrainian NLP/declension work. |
| 7-days-ago lookup assumes one point per calendar day | Matches `mapHistory.ts`'s actual output (daily NBU range data, carry-over duplicates included, not skipped) — verified live in the `rate-history` slice. |

## Migration Plan

1. `lib/currency/weeklyMove.ts` + tests (red → green).
2. `uk.trend.*` strings in `lib/i18n/uk.ts` + `uk.test.ts` coverage.
3. `lib/currency/trendSentence.ts` + tests (red → green).
4. `components/rates/TrendHint.tsx`.
5. Wire into `CurrencyHistory.tsx`'s `ready` branch.
6. `npm run verify` green; live-verify in the browser; hand off to checkers.
7. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Open Questions

None blocking. Decision 1 is the one real scope call this slice makes.
