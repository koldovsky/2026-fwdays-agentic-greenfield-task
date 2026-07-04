## 1. Repository queries

- [x] 1.1 Add `list_weigh_ins_asc` and `count_weigh_ins` to `bot/repository.py`
- [x] 1.2 Extend `tests/test_db.py` for new query helpers

## 2. Month stats module (FR-HIST-03..06, FR-HIST-08..09, NFR-TZ-01, NFR-TEST-01)

- [x] 2.1 Add `bot/month_stats.py` with Kyiv timezone, `MonthSummary`, `month_bounds_kyiv`
- [x] 2.2 Implement `summarize_month` with carry-over baseline (FR-HIST-06)
- [x] 2.3 Implement `previous_month_weight_delta` (FR-HIST-04) and `find_best_month` (FR-HIST-08..09)
- [x] 2.4 Add `tests/test_month_stats.py` covering boundaries, carry-over, prev month, best month, sparse data

## 3. View formatters

- [x] 3.1 Add table formatter for `/історія` (last 8, Ukrainian dates and decimal comma) (FR-HIST-01, FR-MSG-06)
- [x] 3.2 Add message builders for `/прогрес`, `/місяць`, `/весь_час` reusing `compare`, `trends`, `messages`

## 4. Command handlers

- [x] 4.1 Add `bot/handlers/views.py` with `/історія`, `/прогрес`, `/місяць`, `/весь_час` handlers
- [x] 4.2 Register four handlers in `bot/main.py`
- [x] 4.3 Add `tests/test_views_handlers.py` for each command (empty, single, multi-entry cases)
- [x] 4.4 Assert `/прогрес` and `/місяць` append supportive lines when comparison exists (FR-MSG-03, FR-MSG-05)
- [x] 4.5 Assert `/історія` has no supportive copy (FR-MSG-06)

## 5. Help command update (FR-MSG-08)

- [x] 5.1 Extend `bot/handlers/help.py` to list `/прогрес`, `/історія`, `/місяць`, `/весь_час`
- [x] 5.2 Extend `tests/test_help_handlers.py` for updated command roster

## 6. Verification and PRD traceability

- [x] 6.1 Run `make check` from `nedilya-na-vagakh/`; all gates green
- [x] 6.2 Map behavior to PRD IDs: FR-HIST-01..09, FR-MSG-05..06, NFR-TZ-01
- [x] 6.3 Update `docs/current-state.md` with history-views implementation summary
