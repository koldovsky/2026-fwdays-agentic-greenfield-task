# Capability: comparison

**Wave 3.** Delivers US-4 (parents compare options).

## Purpose
Compare 2–3 programs side by side and give a text recommendation.

## Requirements
- FR-COMPARE-01 — compare 2–3 options in a table with an app recommendation.

## Scope
**In:**
- Select 2–3 programs for comparison.
- Table across cost, city, study form, chance %/band, category, seats.
- A text recommendation reasoning across the compared options.

**Out:** more than 3 at once; the detail view (`program-detail`).

## Depends on
`scoring-engine`, `program-data`, `app-shell`; selection may come from `recommendations` or `shortlist`.

## Consumed by
— (leaf view).

## Key acceptance
- Comparison works for 2–3 options and produces a text recommendation (acceptance §13).
- Compares cost, city, and chance in one table (US-4).
