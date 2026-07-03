## Context

Every capability reads one static admissions dataset. The MVP ships 11 illustrative
programs (TC-DATA-01), not an official registry, with a first-class freshness date
the UI surfaces honestly (BC-HONESTY-01).

## Goals / Non-Goals

**Goals:**
- Typed `Program` registry with weights summing to 1.0, 3-year cutoffs, seats, tuition,
  dormitory, and accepted electives.
- Benefit catalog (`village`, `quota`, `orphan`) with additive fractions.
- `DATA_SESSION`, `DATA_AS_OF`, `DATA_DISCLAIMER` metadata.
- Derived helpers: `FIELDS`, `CITIES`, `getProgram(id)`.

**Non-Goals:**
- Runtime fetch, admin editing, or multi-year data pipelines.
- More than 11 sample programs for MVP.

## Decisions

### D1 — Static bundled data in `app/lib/programs.ts`
No network I/O; types live in `app/lib/types.ts`. Keeps scoring deterministic and
offline-friendly.

### D2 — Freshness as first-class exports
`DATA_AS_OF` is rendered wherever program facts appear so users never mistake sample
data for live ministry figures.

## Risks / Trade-offs

- **Sample data mistaken for official** → disclaimer + session label on every surface.
- **Shape drift** → single `Program` type consumed by scoring and all UI slices.
