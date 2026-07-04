## 1. Parse module (FR-LOG-01..03, NFR-TEST-01)

- [x] 1.1 Add `bot/parse.py` with `ParsedWeighIn`, `ParseError`, and `parse_weigh_in(text)`
- [x] 1.2 Support trim, whitespace/newline separators, and dot/comma decimals
- [x] 1.3 Add `tests/test_parse.py` covering valid inputs, comma/dot decimals, newlines, and error cases

## 2. Repository extension (FR-LOG-07)

- [x] 2.1 Implement `delete_latest_weigh_in(conn, user_id)` in `bot/repository.py`
- [x] 2.2 Add repository tests for delete latest (success and empty) in `tests/test_db.py`

## 3. Weigh-in handlers (FR-LOG-04..08)

- [x] 3.1 Create `bot/handlers/weigh_in.py` with Ukrainian message constants
- [x] 3.2 Implement `/вага` command: set awaiting flag, send hint (FR-LOG-05)
- [x] 3.3 Implement text handler: parse, persist on success, invalid-input reply (FR-LOG-04, FR-LOG-06)
- [x] 3.4 Implement `/скасувати` command: delete latest, confirm or empty message (FR-LOG-07)
- [x] 3.5 Ensure no day-of-week gate on logging (FR-LOG-08)

## 4. Wire handlers (TC-STACK-01)

- [x] 4.1 Register `/вага`, `/скасувати`, and awaiting text handler in `bot/main.py` (group 0)
- [x] 4.2 Add handler tests with mocked update/context where practical

## 5. Verification and PRD traceability

- [x] 5.1 Run full `pytest` suite from `nedilya-na-vagakh/`; all tests green
- [x] 5.2 Map behavior to PRD IDs: FR-LOG-01..08
- [x] 5.3 Update `docs/prd.md` statuses for FR-LOG-* from `accepted` → `shipped`
- [x] 5.4 Update `docs/current-state.md` with weigh-in implementation summary
