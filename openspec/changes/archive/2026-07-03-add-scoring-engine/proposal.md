## Why

The chance model is the heart of the product: it turns NMT scores + benefits + a
program's data into a competitive score, a chance estimate with an uncertainty
band, and a risk category. It must implement the §6 model exactly, stay pure (no
UI, no storage, no I/O) so it is deterministic and unit-testable, recompute
instantly on any input change (NFR-PERF-01), and — per the product's honesty
principle — always return a band rather than a bare guarantee (BC-HONESTY-01).
This change backfills the spec for the logic that already lives in
`app/lib/scoring.ts`.

## What Changes

- Implement `competitiveScore` = `Σ(subject_score × subject_weight) × (1 + benefit)`
  capped at 200 (FR-SCORE-01), with `rawScore` and `benefitBonus` helpers and a
  `clampScore` input guard that clamps to the 100–200 NMT range.
- Implement the chance estimate (FR-SCORE-02): `logistic(diff, k)` where
  `diff = competitive − cutoff2024`, clamped to 2–98 %, with
  `k = 3.0 + min(1.4, budgetSeats / 90)` (curve flattens as seats grow).
- Implement the uncertainty band (FR-SCORE-02, BC-HONESTY-01):
  `[logistic(diff − σ), logistic(diff + σ)]` where σ is the population standard
  deviation of the three cutoff years, floored at `1.6`. `evaluate()` always returns
  a band alongside the point chance.
- Implement the risk category (FR-SCORE-03): Safe ≥ 75 %, Realistic 40–74 %, Reach
  < 40 %, keyed to the design-system traffic-light codes (`safe`/`real`/`dream`).
- Implement `programFits` (does the program accept the applicant's elective) and a
  single `evaluate()` entry point returning `{ competitive, chance, band, category,
  fits }`. All functions are pure so a full recompute over the dataset stays
  < 100 ms (NFR-PERF-01).

## Capabilities

### New Capabilities
- `scoring-engine`: the pure §6 chance model — competitive score, logistic chance,
  uncertainty band, and risk category — that `recommendations`, `program-detail`,
  and `comparison` consume.

### Modified Capabilities
<!-- None — Wave 1 core logic; depends on `program-data` but changes no existing spec. -->

## Impact

- **Code:** `app/lib/scoring.ts` (all scoring functions and the `Evaluation` result
  type); reads types from `app/lib/types.ts` and the benefit catalog from
  `app/lib/programs.ts`.
- **Requirements traced:** FR-SCORE-01, FR-SCORE-02, FR-SCORE-03, NFR-PERF-01,
  BC-HONESTY-01.
- **Downstream:** consumed by `recommendations`, `program-detail`, and `comparison`;
  no UI, storage, or I/O in this capability.
