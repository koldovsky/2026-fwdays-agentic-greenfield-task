## Context

Choosing where to apply is a side-by-side decision across chance, cutoff, score,
seats, cost, city, and dormitory (FR-COMPARE-01). The view reads 2–3 program ids
from shared compare state and renders a `.pk-table` plus text advice.

## Goals / Non-Goals

**Goals:**
- Table columns per selected program; rows for chance (+ band + category label),
  2024 cutoff, competitive score, budget seats, tuition, city, dormitory.
- Text recommendation naming highest-chance option as priority 1.
- Empty state below 2 selections; cap at 3 via store.
- `uk-UA` formatting throughout; chance row never color-only.

**Non-Goals:**
- Adding a 4th column or exporting to PDF.
- Independent compare state (owned by profile store / `state-persistence`).

## Decisions

### D1 — `compareAdvice` in `app/lib/recommend.ts`
Pure function: empty below 2 selections; otherwise names max-chance program.

### D2 — Eligible-only advice among compared set
Recommendation considers only programs that fit the current elective.

### D3 — Horizontal scroll on narrow viewports
Table remains readable at phone width without clipping header semantics.

## Risks / Trade-offs

- **Color-only chance cell** → append category text label beside percent.
- **Stale compare ids** → resolve against current program registry; missing ids skipped.
