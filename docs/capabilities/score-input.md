# Capability: score-input

**Wave 1.** How the applicant tells the app about themselves.

## Purpose
Collect NMT scores, the 4th-subject choice, and benefit selections that feed the
scoring engine.

## Requirements
- FR-INPUT-01 — NMT score entry for 4 subjects (3 required + 1 elective).
- FR-INPUT-02 — 4th-subject choice, filtering to programs that accept it.
- FR-INPUT-03 — benefit toggles (rural coefficient, quota, special conditions) affecting score.

## Scope
**In:**
- Validated inputs for 3 required subjects + 1 elective (valid NMT ranges).
- Elective picker; programs incompatible with the chosen 4th subject are excluded downstream.
- Benefit toggles sourced from `program-data` benefit catalog.
- Emits current input state to `scoring-engine`; persists via `state-persistence`.

**Out:** the score math (`scoring-engine`); result rendering (`recommendations`).

## Depends on
`program-data` (subjects, benefit catalog), `state-persistence`.

## Consumed by
`scoring-engine` / `recommendations` (as input source).

## Key acceptance
- All four subject scores can be entered and validated.
- Changing the 4th subject changes the set of eligible programs.
- Toggling a benefit instantly flows into recomputation (< 100 ms, NFR-PERF-01).
- Inputs persist across reload.
