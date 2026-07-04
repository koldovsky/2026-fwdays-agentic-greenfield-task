## Why

The bot foundation is in place (storage, allowlist, polling), but users cannot yet log
weigh-ins — the core value loop of «Неділя на вагах». Capability 2 delivers `/вага`
and `/скасувати` so the single allowlisted user can record four scale metrics and undo
the latest entry.

## What Changes

- Add pure parsing functions for four metrics (weight kg, fat %, muscle %, BMI) with
  space/newline separators and dot or comma decimals (FR-LOG-01..03, NFR-TEST-01).
- Register `/вага` command: show Ukrainian input hint, accept a follow-up message with
  four numbers, validate, persist via repository, confirm in Ukrainian (FR-LOG-04..06).
- Register `/скасувати` command: remove the most recent weigh-in and confirm in
  Ukrainian (FR-LOG-07).
- No day-of-week gate on logging — any day is allowed (FR-LOG-08).
- Extend repository with `delete_latest_weigh_in` for undo.
- No comparison deltas, supportive messaging, or trend labels in this change (those
  ship in `compare`, `messaging`, and later capabilities).

## Capabilities

### New Capabilities

- `weigh-in-parse`: Pure input parsing — four numbers, trim, space/newline separators,
  dot/comma decimals; unit-tested (FR-LOG-01..03, NFR-TEST-01).
- `weigh-in-commands`: `/вага` and `/скасувати` Telegram handlers with Ukrainian
  prompts, errors, persistence, and undo (FR-LOG-04..08).

### Modified Capabilities

- `sqlite-persistence`: Add requirement for deleting the user's most recent weigh-in
  row (supports FR-LOG-07).

## Impact

- **New code**: `bot/parse.py`, `bot/handlers/weigh_in.py` (or similar), tests under
  `tests/test_parse.py`, `tests/test_weigh_in_handlers.py`.
- **Modified code**: `bot/main.py` (register handlers), `bot/repository.py`
  (`delete_latest_weigh_in`).
- **Dependencies**: none new; builds on existing `python-telegram-bot` and SQLite.
- **Downstream**: `compare` capability will hook post-log confirmation to show deltas.
