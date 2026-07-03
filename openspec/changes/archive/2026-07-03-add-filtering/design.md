## Context

Applicants narrow 11+ programs by field, city, and risk appetite. Filters must
combine instantly (no submit), respect NFR-PERF-01, and show a helpful empty state
when nothing matches (FR-UX-01).

## Goals / Non-Goals

**Goals:**
- Multi-select field and city `.pk-chip` filters sourced from `FIELDS`/`CITIES`.
- Risk tabs: Усі / Надійно / Реально / Мрія over scoring categories.
- Combinable AND logic within field+city; empty group = no narrowing.
- `role="group"` + `aria-pressed` on chips and tabs.

**Non-Goals:**
- Full-text program search (Phase 3).
- Server-side query or URL-synced filter state.

## Decisions

### D1 — Filter state in profile store
`toggleField` / `toggleCity` persist with the rest of the profile.

### D2 — `matchesCategory` in recommend module
Category tab logic shares the same selector layer as the recommendation list.

### D3 — Empty-filter hint names all levers
Copy mentions category tab, field/city chips, and score changes.

## Risks / Trade-offs

- **Over-filtering to zero results** → dedicated empty state, never a blank list.
- **Tab vs chip interaction** → both apply in sequence on the already-scored set.
