## Why

All v1 command handlers are implemented across prior capabilities, but the bot never registers the
full roster with Telegram's command menu (`set_my_commands`), and there is no automated check that
every PRD command is wired in `bot/main.py`. Capability `commands` closes FR-CMD-01 with a final
integration pass so users see the complete menu in Telegram and regressions are caught in tests.

## What Changes

- Define the canonical v1 command roster (nine commands per FR-CMD-01) in one module with Ukrainian
  menu descriptions.
- On bot startup, call `set_my_commands` so Telegram shows the full menu to allowlisted users.
- Add tests asserting every roster command has a registered handler and that startup registers the
  menu with matching command names and descriptions.
- No new user-facing commands, scheduler work, or changes to handler behavior beyond registration
  polish.

## Capabilities

### New Capabilities

- `command-surface`: Canonical command roster, handler coverage check, and Telegram command-menu
  registration (FR-CMD-01).

### Modified Capabilities

- `bot-runtime`: Add startup requirement to register the v1 command menu via `set_my_commands`.

## Impact

- **New code**: `bot/commands.py`, `tests/test_command_surface.py`.
- **Modified code**: `bot/main.py` (post-init hook to set command menu; optional refactor to register
  handlers from the canonical roster).
- **Dependencies**: existing handler modules; `python-telegram-bot` `BotCommand` / `set_my_commands`.
- **PRD**: ships `FR-CMD-01` (`accepted` → `shipped` on archive).
