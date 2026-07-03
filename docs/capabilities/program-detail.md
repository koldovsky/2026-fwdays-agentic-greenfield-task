# Capability: program-detail

**Wave 3.** The "where does the number come from" view (a parent need).

## Purpose
Explain a single program: how the competitive score was computed, its cutoff
history, and advice.

## Requirements
- FR-DETAIL-01 — score breakdown, cutoff history by year, advice.
- BC-HONESTY-01 — disclaimer + band shown in context.

## Scope
**In:**
- Per-subject breakdown: score × weight → contribution → benefit multiplier → competitive score.
- Cutoff history by year (≥3 years) with the band/σ context.
- Category-appropriate advice text (Reach / Realistic / Safe recommendation from §6).
- Freshness date + disclaimer.

**Out:** editing inputs (`score-input`); comparison across programs (`comparison`).

## Depends on
`scoring-engine`, `program-data`, `app-shell`.

## Consumed by
— (leaf view; linked from `recommendations`, `comparison`, `shortlist`).

## Key acceptance
- Detail explains the score calculation and shows cutoff history (acceptance §13).
- Transparent "where the number comes from" (parent persona need).
