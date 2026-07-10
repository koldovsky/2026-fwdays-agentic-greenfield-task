# Add Comfort Score

## Why

Weekend trip decisions need a single readable signal beyond raw forecast numbers.
`FR-COMFORT-01` … `FR-COMFORT-05` require a pure scoring function, Ukrainian
rationale, badge tier data, and a weekend highlight value derived from daily
forecast inputs. This change implements the framework-free domain layer first;
forecast day-card rendering remains in the `add-forecast` UI integration slice.

## What Changes

- Pure `comfortScore()` in `lib/scoring/comfort.ts` with unit tests
- Badge tier helper and weekend highlight computation
- Output eval for rain/cold rationale honesty (`FR-COMFORT-03`)
- Trace checker support for categorized IDs such as `FR-COMFORT-01`

## Impact

- Affected specs: `comfort-score`
- Affected code: `lib/scoring/`, `evals/cases/comfort.eval.ts`,
  `scripts/check-traceability.mjs`
- Dependencies: none (domain-only slice; UI wiring lands in `add-forecast` follow-up)
