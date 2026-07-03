## 1. Constants and result shape

- [x] 1.1 Define `SCORE_MIN`/`SCORE_MAX` (100/200), `SAFE_THRESHOLD` (75), `REAL_THRESHOLD` (40), and `CATEGORY_LABEL` (Ukrainian traffic-light labels) in `app/lib/scoring.ts`
- [x] 1.2 Define the `Evaluation` result interface: `competitive`, `chance`, `band` `[lo, hi]`, `category`, `fits`

## 2. Competitive score (FR-SCORE-01)

- [x] 2.1 Implement `clampScore` — clamp to 100–200, round to integer, fall back to `SCORE_MIN` for non-finite input
- [x] 2.2 Implement `benefitBonus` — sum the active benefit bonuses from the `BENEFITS` catalog
- [x] 2.3 Implement `rawScore` — weighted sum of `score × coefficient` over the program's coefficient keys
- [x] 2.4 Implement `competitiveScore` — `rawScore × (1 + benefitBonus)` capped at 200

## 3. Chance, band, and category (FR-SCORE-02, FR-SCORE-03, BC-HONESTY-01)

- [x] 3.1 Implement `logistic(diff, k)` — `round(100 / (1 + exp(-diff / k)))` clamped to 2–98
- [x] 3.2 Implement `curveK` — `3.0 + min(1.4, budgetSeats / 90)`
- [x] 3.3 Implement `cutoffVolatility` — population stdev of the 2022/2023/2024 cutoffs, floored at 1.6
- [x] 3.4 Implement `categoryOf` — `safe` ≥ 75, `real` ≥ 40, else `dream`
- [x] 3.5 Implement `programFits(program, elective)` — elective acceptance check

## 4. Evaluate entry point (FR-SCORE-01/02/03)

- [x] 4.1 Implement `evaluate(program, scores, benefits, elective)` computing `diff = competitive − cutoffs[2024]`, `k`, and `σ`
- [x] 4.2 Return `competitive`, `chance = logistic(diff, k)`, `band = [min(lo, hi), max(lo, hi)]` from `logistic(diff ∓ σ, k)`, `category`, and `fits` — always a band, never a bare number

## 5. Tests

- [x] 5.1 Unit-test `competitiveScore` against fixed inputs including the 200 cap and the no-benefit case; test `clampScore` bounds and non-finite fallback
- [x] 5.2 Unit-test `logistic` clamping to 2–98, `curveK` seat scaling (including the 1.4 cap), and `cutoffVolatility` floor at 1.6
- [x] 5.3 Unit-test `categoryOf` thresholds at the 40 and 75 boundaries and `programFits` for accepted/rejected electives
- [x] 5.4 Unit-test `evaluate` returns an ordered band bracketing the point chance for representative programs (BC-HONESTY-01)
- [x] 5.5 Benchmark a full-dataset recompute stays under 100 ms (NFR-PERF-01)

## 6. Validation and docs

- [x] 6.1 Run lint and the unit test suite; confirm all scoring tests pass
- [x] 6.2 Run `openspec validate add-scoring-engine --strict` and confirm it passes
- [x] 6.3 Update `docs/current-state.md` with a scoring-engine entry
