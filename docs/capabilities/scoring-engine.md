# Capability: scoring-engine

**Wave 1 · core.** Pure domain logic — the heart of the product.

## Purpose
Turn NMT scores + benefits + a program's data into a competitive score, a chance
estimate with an uncertainty band, and a risk category.

## Requirements
- FR-SCORE-01 — competitive-score from program coefficients + benefits.
- FR-SCORE-02 — chance % with an uncertainty band (lo–hi).
- FR-SCORE-03 — group into Reach / Realistic / Safe.
- §6 chance model — logistic formula, `k`, σ, band, category thresholds.
- NFR-PERF-01 — recalculation < 100 ms on any input change.
- BC-HONESTY-01 — always produce a band, never a bare guarantee.

## Scope
**In (pure functions, no UI/storage):**
- `competitive_score = Σ(subject_score × subject_weight) × (1 + benefit)`.
- `chance% = logistic(competitive_score − last_year_cutoff, k)`, `k` scaling with state-funded seats.
- `band = [logistic(diff − σ), logistic(diff + σ)]`, σ = stdev of cutoff over 3 years.
- Category mapping: 🔴 Reach `< 40%`, 🟡 Realistic `40–74%`, 🟢 Safe `≥ 75%`.

**Out:** rendering (`recommendations`), storage, input collection.

## Depends on
`program-data` (data shape).

## Consumed by
`recommendations`, `program-detail`, `comparison`.

## Key acceptance
- Given fixed inputs, outputs match the §6 formulas (unit-tested).
- Band is always returned; category thresholds exactly match §6 table.
- Full recompute across the dataset stays < 100 ms.
