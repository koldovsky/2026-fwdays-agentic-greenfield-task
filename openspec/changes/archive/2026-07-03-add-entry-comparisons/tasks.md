## 1. Compare module (FR-CMP-01..04, NFR-TEST-01)

- [x] 1.1 Add `bot/compare.py` with `MetricDeltas`, `compute_metric_deltas`, and `format_delta`
- [x] 1.2 Implement `build_comparison_message` for baseline, vs-previous, and від-старту cases
- [x] 1.3 Add `tests/test_compare.py` covering delta math, formatting, and message assembly

## 2. Repository extension

- [x] 2.1 Implement `get_first_weigh_in(conn, user_id)` in `bot/repository.py`
- [x] 2.2 Implement `list_weigh_ins_desc(conn, user_id, *, limit)` in `bot/repository.py`
- [x] 2.3 Add repository tests for first entry and descending list in `tests/test_db.py`

## 3. Weigh-in handler integration (FR-CMP-01..03)

- [x] 3.1 After successful insert, load recent/first entries and append comparison block to success reply
- [x] 3.2 Extend handler tests to assert baseline on first log and deltas on subsequent logs

## 4. Verification and PRD traceability

- [x] 4.1 Run `make check` from `nedilya-na-vagakh/`; all gates green
- [x] 4.2 Map behavior to PRD IDs: FR-CMP-01..04
- [x] 4.3 Update `docs/current-state.md` with compare implementation summary
