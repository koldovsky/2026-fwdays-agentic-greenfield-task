## Context

Recommendations are the primary product output: sorted program cards with honest
chance, band, and traffic-light category (never color-only). Non-fitting programs
sink to the bottom with neutral copy. Empty filters must never yield a blank screen.

## Goals / Non-Goals

**Goals:**
- Sorted list: highest-chance fitting programs first; non-fitting at bottom.
- `.pk-ring` chance display + band label; `.pk-pill` category with dot + word.
- Persistent disclaimer and `DATA_AS_OF` freshness label.
- Helpful `.pk-empty` state with relax-filters hint.

**Non-Goals:**
- Filtering UI (owned by `filtering`); save/compare actions (owned by sibling slices).
- Personalized ML ranking beyond the §6 model.

## Decisions

### D1 — Selectors in `app/lib/recommend.ts`
`selectPrograms` and `matchesCategory` keep sorting/filter logic testable outside React.

### D2 — `ChanceRing` + `CategoryPill` split
Ring handles numerals; pill handles category text — both expose a11y labels.

### D3 — No invented chance for wrong elective
Non-fitting cards show "Інший предмет НМТ" instead of a fake percentage.

## Risks / Trade-offs

- **Color-only regression** → every category signal pairs color with text/dot.
- **Empty state copy drift** → centralized in `app/lib/copy.ts`.
