# Capability: filtering

**Wave 2.** Narrows the recommendation list.

## Purpose
Let the user refine recommendations by field, city, and risk category.

## Requirements
- FR-FILTER-01 — field & city selection to narrow recommendations.
- FR-FILTER-02 — filter the list by risk category.
- FR-UX-01 — empty state when a filter matches nothing.

## Scope
**In:**
- Field and city selectors sourced from `program-data`.
- Risk-category filter (Reach / Realistic / Safe) over computed categories.
- Combinable filters; instant re-render (NFR-PERF-01).
- Empty-filter state with a hint to relax filters.

**Out:** the underlying list rendering (`recommendations`); name search (`program-search`, Phase 3).

## Depends on
`recommendations`, `program-data`.

## Consumed by
— (refines `recommendations` in place).

## Key acceptance
- Selecting a city/field/risk narrows the list correctly and instantly.
- No matches shows the empty-filter hint, not a blank screen.
