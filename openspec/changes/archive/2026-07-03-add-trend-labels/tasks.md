## 1. Trends module (FR-TREND-01..03, NFR-TEST-01)

- [x] 1.1 Add `bot/trends.py` with `STABLE_THRESHOLD`, `TrendLabel`, and `classify_trend`
- [x] 1.2 Implement `classify_metric_deltas(deltas: MetricDeltas)` with muscle % inversion
- [x] 1.3 Add `tests/test_trends.py` covering threshold boundary, sign cases, and inversion

## 2. Comparison integration (FR-TREND-01..03 via entry-comparisons)

- [x] 2.1 Extend `build_comparison_message` to append ` — {label}` on each vs-previous metric line
- [x] 2.2 Keep baseline and «від старту» lines without trend labels
- [x] 2.3 Extend `tests/test_compare.py` for labeled second/third entry messages

## 3. Handler verification

- [x] 3.1 Extend `tests/test_weigh_in_handlers.py` to assert trend labels in success reply on second log

## 4. Verification and PRD traceability

- [x] 4.1 Run `make check` from `nedilya-na-vagakh/`; all gates green
- [x] 4.2 Map behavior to PRD IDs: FR-TREND-01..03
- [x] 4.3 Update `docs/current-state.md` with trend-labels implementation summary
