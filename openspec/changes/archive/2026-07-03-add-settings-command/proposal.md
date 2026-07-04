## Why

`user_settings` rows and supportive messaging already exist, but there is no way to review or
update display name or Sunday reminder time after the defaults are created. Capability `settings`
adds `/налаштування` so Оленка can personalize messages and set when she wants the weekly nudge,
unblocking `onboarding` (which reuses the same input patterns) and `reminders`.

## What Changes

- Add `/налаштування` — show current `display_name` (or «загальні повідомлення» when cleared) and
  `reminder_time`; offer inline actions to change name, clear name, or change reminder time
  (FR-SET-01, FR-SET-02).
- Add pure name-validation logic: trim whitespace, reject empty, max 40 characters (FR-SET-03);
  unit tests (NFR-TEST-01).
- Add repository helpers to update `display_name` (including NULL for cleared) and `reminder_time`.
- Register the settings handler and conversation flow in `bot/main.py`.
- Extend `/допомога` to mention `/налаштування`.
- No `/start` onboarding flow, Sunday scheduler, or full FR-CMD-01 Telegram command-menu polish in
  this change.

## Capabilities

### New Capabilities

- `settings-command`: `/налаштування` handler, settings summary, and multi-step edits for name and
  reminder time (FR-SET-01, FR-SET-02).
- `name-validation`: Pure display-name validation with unit tests (FR-SET-03).

### Modified Capabilities

- `help-command`: List `/налаштування` in the `/допомога` command roster.

## Impact

- **New code**: `bot/handlers/settings.py`, `bot/name_validation.py`, `tests/test_name_validation.py`,
  `tests/test_settings_handlers.py`.
- **Modified code**: `bot/repository.py` (update settings), `bot/main.py` (register handler and
  conversation), `bot/handlers/help.py` (updated command list).
- **Dependencies**: existing `user_settings` schema, `get_or_create_settings`, `messages.py`
  name-prefix behavior (FR-MSG-01/02).
- **Downstream**: `onboarding` reuses name validation and reminder-time input; `reminders` reads
  `reminder_time`; `commands` polish pass registers the full Telegram command menu.
