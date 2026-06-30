## 1. Pure weekly move (tests first)

- [x] 1.1 Write `lib/currency/weeklyMove.test.ts` against the not-yet-existing
      `./weeklyMove` (`@trace FR-TREND-01`): 30 points with a known 7-days-ago
      vs. last-point ratio produce the expected signed percentage; fewer than
      8 points → `null`; a zero rate 7 days ago → `null` (no division by
      zero); never throws. Observe **RED**.
- [x] 1.2 Add `lib/currency/weeklyMove.ts`. Run until **GREEN**.

## 2. i18n

- [x] 2.1 Add `uk.trend.*` to `lib/i18n/uk.ts` — up/down/flat sentence
      templates, code as subject (design.md Decision 1), no exclamation
      marks (`FR-I18N-01`, `BC-BRAND-01`).

## 3. Pure sentence builder (tests first)

- [x] 3.1 Write `lib/currency/trendSentence.test.ts` (`@trace FR-TREND-02`,
      `FR-TREND-03`): `tone="up"` produces the strengthening sentence with
      the formatted percentage; `tone="down"` the weakening sentence;
      `tone="flat"` the «майже без змін» sentence with no percentage; no
      exclamation marks in any output. Observe **RED**.
- [x] 3.2 Add `lib/currency/trendSentence.ts`. Run until **GREEN**.

## 4. Component

- [x] 4.1 `components/rates/TrendHint.tsx` — takes `code` + `points`; calls
      `weeklyMovePct`, then the reused `trendTone` (`@/components/ds`), then
      `trendSentence`; renders nothing when `weeklyMovePct` returns `null`
      (design.md Decision 3).
- [x] 4.2 Wire `<TrendHint code={code} points={state.points} />` into
      `CurrencyHistory.tsx`'s `ready` branch, above `<HistoryChart>`.

## 5. Eval case

- [x] 5.1 Add `evals/cases/trend-hint.eval.ts` — rubric: calm phrasing (no
      exclamation marks, no hype), correct direction wording for
      strengthen/weaken/flat, number-then-detail framing.

## 6. Verification

- [x] 6.1 `npm run test:run` — all unit tests green.
- [x] 6.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 6.3 Live-verify in a real browser (select a currency, confirm the
      sentence renders above the chart with the correct tone/wording).
- [x] 6.4 Tick all tasks above; update `docs/current-state.md` for maker handoff.
