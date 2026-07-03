## Context

The §6 chance model is the product's core logic. It must stay pure (no UI, storage,
or I/O), recompute instantly on input change (NFR-PERF-01), and always return an
uncertainty band rather than a bare guarantee (BC-HONESTY-01). This slice
backfills the design record for `app/lib/scoring.ts`, consumed by every downstream
UI capability.

## Goals / Non-Goals

**Goals:**
- `competitiveScore` = weighted subject sum × (1 + benefit bonus), capped at 200.
- Logistic chance with seat-dependent curve flattening; clamped 2–98 %.
- Uncertainty band from cutoff volatility (σ floored at 1.6).
- Traffic-light categories: Safe ≥ 75 %, Realistic 40–74 %, Reach < 40 %.
- Single `evaluate()` entry returning `{ competitive, chance, band, category, fits }`.

**Non-Goals:**
- UI rendering, persistence, or program registry (owned by other capabilities).
- Official cutoff data or backend integration.

## Decisions

### D1 — Pure functions in `app/lib/scoring.ts`
All scoring logic is side-effect-free so unit tests can pin the model and a full
dataset recompute stays < 100 ms.

### D2 — Shared thresholds exported
`SAFE_THRESHOLD` (75) and `REAL_THRESHOLD` (40) are module constants so advice
copy and category assignment cannot drift.

### D3 — `programFits` gates eligibility
Elective acceptance is checked before chance is meaningful; non-fitting programs
are flagged for downstream neutral treatment.

## Risks / Trade-offs

- **Threshold drift in copy** → export constants; downstream imports them.
- **Breakdown sum vs capped competitive** → handled in `program-detail` via scaled rows.
