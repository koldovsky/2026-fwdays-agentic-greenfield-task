# Capability: program-data

**Wave 0 · foundation.** The sample dataset every other capability reads.

## Purpose

Provide the structured admissions data (11 sample universities per TC-DATA-01)
that scoring, input filtering, detail views, and comparison depend on.

## Requirements
- §10 Data requirements — program registry, cutoff scores (≥3 years), seats & cost, benefits.
- TC-DATA-01 — 11 sample universities; illustrative cutoffs; freshness date exposed.
- BC-HONESTY-01 — freshness date must be visible in the UI (data surfaced here).

## Scope
**In:**
- Program registry: university, program, city, study form, NMT subjects + weighting coefficients.
- Cutoff history: values for the last ≥3 years (for σ / band in `scoring-engine`).
- Seats & cost: number of state-funded seats, tuition price.
- Benefit catalog: categories and their effect on score/quotas.
- A single freshness/`as-of` date field.
- Typed data-access module (no I/O — static bundled data for MVP).

**Out:** live official registry integration (Phase 2), search (`program-search`).

## Depends on
Nothing.

## Consumed by
`scoring-engine`, `score-input`, `program-detail`, `comparison`, `recommendations`.

## Key acceptance
- 11 programs load with all §10 fields populated and internally consistent (weights, ≥3 cutoff years, seats, price).
- Freshness date is a first-class field, ready for UI display.
