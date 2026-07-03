# Capability: recommendations

**Wave 2.** The primary output — delivers US-1, US-3.

## Purpose
Render the grouped list of programs with chance %, uncertainty band, and risk
category, plus honesty framing and empty states.

## Requirements
- FR-SCORE-03 — group recommendations by risk (Reach / Realistic / Safe).
- FR-SCORE-02 — show chance % with the uncertainty band per program.
- FR-UX-01 — empty state with a hint when there are no results.
- BC-HONESTY-01 — always show band + disclaimer; never a guarantee.

## Scope
**In:**
- Grouped, sorted list UI using the green/amber/red traffic-light code (per `DESIGN.md`).
- Per-item: chance %, lo–hi band, category, quick facts, links to detail.
- Persistent honesty disclaimer; data freshness date visible.
- Empty state (no eligible programs / scores not entered yet) with guidance.

**Out:** the math (`scoring-engine`); narrowing (`filtering`); saving (`shortlist`).

## Depends on
`scoring-engine`, `score-input`, `program-data`, `app-shell`.

## Consumed by
`filtering`, `shortlist` (entry point to save).

## Key acceptance
- Entering scores yields a grouped list in under 3 min (acceptance §13).
- Each item shows %, band, and category; color is never the only signal (NFR-A11Y-01).
- Disclaimer and freshness date are always present.
- Empty state shows a helpful hint.
