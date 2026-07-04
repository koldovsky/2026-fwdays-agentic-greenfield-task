## Context

Prior capabilities shipped all nine v1 handlers in `bot/main.py` and listed them in `/допомога`,
but Telegram's native command menu (the `/` picker) is never populated — `set_my_commands` is not
called. FR-CMD-01 requires both implementation and menu listing. Handler wiring is duplicated as
nine separate `filters.Regex` constants with no single source of truth, so a missing registration
would only be caught manually.

## Goals / Non-Goals

**Goals:**

- Single module `bot/commands.py` exporting `BOT_COMMANDS: list[BotCommand]` as the canonical roster.
- `build_application` registers handlers for every roster command (existing handlers unchanged).
- Post-init hook calls `application.post_init` to `await bot.set_my_commands(BOT_COMMANDS)`.
- Unit tests for roster completeness, handler coverage, and menu registration hook.

**Non-Goals:**

- Sunday reminders (`reminders` capability) or new commands.
- Changing `/допомога` text or handler behavior.
- BotFather manual setup — runtime `set_my_commands` is sufficient for v1.
- Scope or locale commands (`BotCommandScope`) — single-user bot; default scope is fine.

## Decisions

### 1. `bot/commands.py` as single source of truth

```python
from telegram import BotCommand

BOT_COMMANDS: list[BotCommand] = [
    BotCommand("start", "початкове налаштування"),
    BotCommand("вага", "записати зважування"),
    ...
]
```

Export `command_filter(command: str) -> filters.Regex` helper that builds
`^/{command}(?:@\w+)?$` for handler registration.

**Rationale:** One list drives menu registration and test assertions; descriptions align with
`/допомога` copy.

**Alternative:** Duplicate list in tests only — rejected; drift risk.

### 2. Post-init hook for `set_my_commands`

```python
async def _register_command_menu(application: Application) -> None:
    await application.bot.set_my_commands(BOT_COMMANDS)

application.post_init = _register_command_menu
```

**Rationale:** PTB v20+ `post_init` runs once before polling; no network call during import/tests
that only build the app (tests mock `set_my_commands` when verifying the hook).

**Alternative:** Call in `main()` before `run_polling` — works but splits bootstrap; `post_init`
keeps registration tied to `build_application`.

### 3. Handler coverage test via handler inspection

Iterate `application.handlers[0]` (command group), collect regex patterns, assert each roster
command name appears in at least one pattern. Lighter than integration tests against Telegram API.

**Rationale:** Fast regression guard without mocking every handler.

## Risks / Trade-offs

- **[Risk] `set_my_commands` fails at runtime (network)** → Log error but do not block startup;
  handlers still work; user can type commands manually.
- **[Risk] Telegram 100-char description limit** → Keep descriptions short (same as help one-liners).
- **[Trade-off] Help text and menu descriptions may drift** → Reuse wording from `HELP_MESSAGE` lines
  where practical; not mechanically linked in v1.

## Migration Plan

Deploy with next bot restart; no schema migration. Existing users see the menu populate automatically.
