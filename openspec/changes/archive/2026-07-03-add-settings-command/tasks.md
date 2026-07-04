## 1. Name validation (FR-SET-03, NFR-TEST-01)

- [x] 1.1 Add `bot/name_validation.py` with `validate_display_name` and `NameValidationError`
- [x] 1.2 Add `tests/test_name_validation.py` for trim, empty, max length, and boundary cases

## 2. Repository updates

- [x] 2.1 Add `update_display_name` (including NULL) and `update_reminder_time` to `bot/repository.py`
- [x] 2.2 Extend `tests/test_db.py` for new update helpers

## 3. Reminder time parsing

- [x] 3.1 Add `parse_reminder_time` helper (24h `HH:MM`, zero-pad on save) in settings module or `bot/reminder_time.py`
- [x] 3.2 Add unit tests for valid/invalid reminder time strings

## 4. Settings command handler (FR-SET-01, FR-SET-02)

- [x] 4.1 Add `bot/handlers/settings.py` with summary message and inline keyboard actions
- [x] 4.2 Implement name-change flow (prompt → validate → persist → confirm)
- [x] 4.3 Implement clear-name callback (NULL `display_name` → confirm general messages)
- [x] 4.4 Implement reminder-time change flow (prompt → parse → persist → confirm)
- [x] 4.5 Handle invalid name/time with Ukrainian error messages; clear await state appropriately
- [x] 4.6 Cross-clear `AWAITING_WEIGH_IN_KEY` / settings await when switching flows

## 5. Registration and help

- [x] 5.1 Register `/налаштування`, callback handler, and settings text handler in `bot/main.py`
- [x] 5.2 Extend `bot/handlers/help.py` to list `/налаштування`
- [x] 5.3 Add `tests/test_settings_handlers.py` for summary, updates, clear, and validation errors
- [x] 5.4 Extend `tests/test_help_handlers.py` for `/налаштування` in help roster

## 6. Verification and PRD traceability

- [x] 6.1 Run `make check` from `nedilya-na-vagakh/`; all gates green
- [x] 6.2 Map behavior to PRD IDs: FR-SET-01, FR-SET-02, FR-SET-03
- [x] 6.3 Update `docs/current-state.md` with settings implementation summary
