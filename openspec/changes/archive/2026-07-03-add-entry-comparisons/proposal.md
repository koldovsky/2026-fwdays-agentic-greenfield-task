## Why

Weigh-in logging (`add-weigh-in-logging`) is shipped, but `/вага` confirmation is factual only — no
instant feedback vs the last entry or the starting point. Capability `compare` closes that gap so
each log shows meaningful deltas, which every downstream view (`trends`, `messaging`, `history`)
will reuse.

## What Changes

- Add pure comparison functions: per-metric delta vs previous entry, weight delta vs first entry,
  baseline handling for the first log, and Ukrainian delta formatting (FR-CMP-01..04,
  NFR-TEST-01).
- Extend repository with queries for the user's first weigh-in and ordered recent entries
  (supports comparison lookups).
- Enrich `/вага` success confirmation with comparison lines after persist (FR-CMP-01..03).
- No trend labels («прогрес» / «коливання»), supportive messaging, or read-only commands in this
  change — those ship in `trends`, `messaging`, and `history`.

## Capabilities

### New Capabilities

- `entry-comparisons`: Pure delta computation and Ukrainian display formatting for weigh-in
  comparisons (FR-CMP-01..04, NFR-TEST-01).

### Modified Capabilities

- `sqlite-persistence`: Add repository queries to fetch the first weigh-in and a bounded list of
  recent entries in descending order (comparison data access).
- `weigh-in-commands`: Successful `/вага` confirmation SHALL include comparison output per
  FR-CMP-01..03.

## Impact

- **New code**: `bot/compare.py`, `tests/test_compare.py`.
- **Modified code**: `bot/repository.py` (first/recent entry queries), `bot/handlers/weigh_in.py`
  (success message assembly).
- **Dependencies**: none new; builds on existing SQLite repository and weigh-in handlers.
- **Downstream**: `trends` and `messaging` consume the same delta formatting; `history` views
  reuse comparison helpers in later capabilities.
