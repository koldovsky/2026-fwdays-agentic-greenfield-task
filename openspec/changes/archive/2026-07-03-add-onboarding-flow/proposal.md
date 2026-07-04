## Why

`user_settings` rows are created with defaults on first access, but there is no guided first-run
experience: new users never choose a Sunday reminder time or are invited to log their first
weigh-in. Capability `onboarding` adds a one-time `/start` setup flow, persisting
`setup_completed_at` and applying PRD defaults so `reminders` can schedule against a completed
profile.

## What Changes

- Add `/start` handler: two-step one-time setup — (1) Sunday reminder time with presets, custom
  `HH:MM` entry, and **Skip** → `09:00`; (2) optional first weigh-in via **Now** or **Later**
  (FR-ONB-01..03).
- On setup completion (any path), set `display_name` to **Оленка** (no name prompt) and persist
  reminder time; skipping or dismissing applies defaults `Оленка`, `09:00`, `Europe/Kyiv`
  (FR-ONB-04, FR-ONB-05).
- Persist `setup_completed_at` when onboarding finishes; repeated `/start` after completion shows
  short help instead of re-running setup (FR-CMD-02).
- Add repository helper to mark setup complete and update reminder time during onboarding.
- Register `/start` handler, onboarding callbacks, and custom-time text handler in `bot/main.py`.
- Extend `/допомога` to list `/start`.
- No Sunday scheduler (`JobQueue`), Telegram BotFather command-menu polish (FR-CMD-01), or
  reminder delivery in this change.

## Capabilities

### New Capabilities

- `onboarding-flow`: `/start` two-step setup, defaults on completion/skip, `setup_completed_at`
  persistence, and post-completion short help (FR-ONB-01..05, FR-CMD-02).

### Modified Capabilities

- `help-command`: List `/start` in the `/допомога` command roster.

## Impact

- **New code**: `bot/handlers/onboarding.py`, `tests/test_onboarding_handlers.py`.
- **Modified code**: `bot/repository.py` (`complete_setup` / `mark_setup_completed`),
  `bot/main.py` (register `/start` and onboarding handlers), `bot/handlers/help.py` (add `/start`
  to help text), `bot/handlers/weigh_in.py` (optional: shared completion hook when first log
  happens during onboarding «Now» path).
- **Reused modules**: `bot/reminder_time.py` (`parse_reminder_time`), weigh-in parse/compare/messages
  for the «Now» branch.
- **Downstream**: `reminders` reads `reminder_time` and `setup_completed_at`; `commands` polish pass
  registers the full Telegram command menu (FR-CMD-01).
