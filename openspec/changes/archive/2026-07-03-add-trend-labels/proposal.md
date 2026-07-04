## Why

`add-entry-comparisons` shipped numeric deltas after each `/вага`, but users still see raw
numbers without qualitative direction. Capability `trends` adds «прогрес» / «коливання» /
«без змін» labels (FR-TREND-01..03) so comparison output is interpretable and reusable by
`messaging` and `history` without duplicating threshold logic.

## What Changes

- Add pure trend-label functions: classify each metric delta with a 0.2 stable threshold and
  inverted direction for muscle % (FR-TREND-01..03, NFR-TEST-01).
- Extend comparison message assembly to append per-metric trend labels alongside existing delta
  lines (consumes `MetricDeltas` from `bot/compare.py`).
- No supportive messaging, read-only commands (`/прогрес`, `/історія`), or history views in this
  change — those ship in `messaging` and `history`.

## Capabilities

### New Capabilities

- `trend-labels`: Pure classification of metric deltas into Ukrainian trend labels with a shared
  stable threshold (FR-TREND-01..03, NFR-TEST-01).

### Modified Capabilities

- `entry-comparisons`: Comparison output SHALL include per-metric trend labels when «vs previous»
  deltas are shown (FR-TREND-01..03 applied to the same deltas as FR-CMP-01).

## Impact

- **New code**: `bot/trends.py`, `tests/test_trends.py`.
- **Modified code**: `bot/compare.py` (`build_comparison_message` enriched with labels), possibly
  `bot/handlers/weigh_in.py` only if assembly moves out of compare.
- **Dependencies**: none new; builds on existing `MetricDeltas` / `format_delta` from compare.
- **Downstream**: `messaging` reads weight trend for supportive lines; `history` reuses label
  helpers in `/прогрес` and `/місяць`.
