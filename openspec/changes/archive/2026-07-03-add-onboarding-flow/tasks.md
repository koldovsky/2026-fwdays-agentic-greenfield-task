## 1. Repository (FR-ONB-04, FR-ONB-05)

- [x] 1.1 Add `complete_onboarding` to `bot/repository.py` — set `reminder_time`, `display_name`
  («Оленка»), and `setup_completed_at` (ISO UTC)
- [x] 1.2 Extend `tests/test_db.py` for `complete_onboarding` and `setup_completed_at` persistence

## 2. Onboarding handler (FR-ONB-01..03)

- [x] 2.1 Add `bot/handlers/onboarding.py` with welcome copy, step keys, and callback constants
  (`onboard:` prefix)
- [x] 2.2 Implement step 1 reminder-time keyboard: presets `08:00`/`09:00`/`10:00`, «Свій час»,
  «Пропустити» → `09:00`
- [x] 2.3 Implement custom-time text path using `parse_reminder_time` with Ukrainian error on
  invalid input
- [x] 2.4 Implement step 2 «Зараз» / «Пізніше» branches; «Зараз» sets `AWAITING_WEIGH_IN_KEY` and
  sends weigh-in hint
- [x] 2.5 Call `complete_onboarding` when step 2 finishes; clear onboarding await keys
- [x] 2.6 Cross-clear `settings_awaiting` and weigh-in await when entering onboarding

## 3. Start command and registration (FR-CMD-02)

- [x] 3.1 Implement `start_command`: if `setup_completed_at` set → `START_HELP_MESSAGE`; else begin
  step 1
- [x] 3.2 Register `/start`, `onboarding_callback`, and `onboarding_message` in `bot/main.py`
  (handler order before settings/weigh-in text handlers)

## 4. Help update (FR-MSG-08)

- [x] 4.1 Add `/start` line to `HELP_MESSAGE` in `bot/handlers/help.py`
- [x] 4.2 Extend `tests/test_help_handlers.py` to assert `/start` in help roster

## 5. Handler tests (NFR-TEST-01)

- [x] 5.1 Add `tests/test_onboarding_handlers.py` — new user flow, preset/skip/custom time,
  invalid custom time, Now/Later, completed `/start` short help

## 6. Verification and PRD traceability

- [x] 6.1 Run `make check` from `nedilya-na-vagakh/`; all gates green
- [x] 6.2 Map behavior to PRD IDs: FR-ONB-01..05, FR-CMD-02
- [x] 6.3 Update `docs/current-state.md` with onboarding implementation summary
