## Why

Every downstream capability — `scoring-engine`, `score-input`, `program-detail`,
`comparison`, `recommendations` — reads a single admissions dataset. Rather than
have each slice re-derive the shape of a program, its coefficients, its cutoff
history, or the benefit catalog, we establish one typed, static data module as the
Wave 0 `program-data` foundation. The MVP intentionally ships **11 sample
universities with illustrative cutoffs, not an official registry** (TC-DATA-01), so
the data must also carry a first-class freshness date the UI can surface honestly
(BC-HONESTY-01). This change backfills the spec for the dataset that already lives
in `app/lib/programs.ts` + `app/lib/types.ts`.

## What Changes

- Define the typed program registry (`Program`) in `app/lib/types.ts`: stable id,
  university, program/specialty, field, city, subject weighting coefficients
  (`ukr`/`math`/`hist`/`eng`) that sum to `1.0`, a 3-year cutoff history
  (2022/2023/2024), state-funded (budget) seat count, human-readable tuition,
  dormitory availability, and the accepted elective ("4th") subjects.
- Ship exactly **11 sample programs** in `app/lib/programs.ts` (`PROGRAMS`), each
  with every §10 field populated and internally consistent (weights sum to 1.0,
  three cutoff years present, seats and tuition set).
- Define the benefit catalog (`BENEFITS`): rural coefficient (`village`, +0.02),
  preferential quota (`quota`, +0.04), and special conditions (`orphan`, +0.02),
  each with a Ukrainian label, description, and additive bonus fraction.
- Expose a first-class freshness date: `DATA_SESSION` (2024), a human-readable
  `DATA_AS_OF` label, and a `DATA_DISCLAIMER` note that the data is illustrative
  (BC-HONESTY-01, TC-DATA-01).
- Provide derived read helpers with no I/O: `FIELDS`, `CITIES`, and `getProgram(id)`.

## Capabilities

### New Capabilities
- `program-data`: the static, typed admissions dataset (11 sample programs, their
  coefficients, ≥3-year cutoff history, seats & cost, accepted electives), the
  benefit catalog, and the first-class data-freshness metadata every other
  capability reads.

### Modified Capabilities
<!-- None — Wave 0 foundation; no existing capability's requirements change. -->

## Impact

- **Code:** `app/lib/programs.ts` (registry, benefit catalog, freshness metadata,
  derived helpers), `app/lib/types.ts` (`Program`, `Coefficients`, `SubjectKey`,
  `ElectiveSubject`, `Benefits`, and related types).
- **Requirements traced:** §10 data requirements, TC-DATA-01, BC-HONESTY-01. Owns
  no FR — it is the data other capabilities' FRs depend on.
- **Downstream:** unblocks `scoring-engine` and every UI capability; no backend, no
  runtime data fetch (static bundled data for MVP).
