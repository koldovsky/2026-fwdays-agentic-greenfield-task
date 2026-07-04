## 1. Command roster module

- [x] 1.1 Add `bot/commands.py` with `BOT_COMMANDS` (nine `BotCommand` entries per FR-CMD-01) and `command_filter()` helper
- [x] 1.2 Add unit test asserting roster command names match FR-CMD-01 exactly

## 2. Application wiring

- [x] 2.1 Refactor `bot/main.py` to use `command_filter()` from `bot/commands.py` for command `MessageHandler` regexes
- [x] 2.2 Add `post_init` hook in `build_application` that calls `set_my_commands(BOT_COMMANDS)`

## 3. Verification

- [x] 3.1 Add `tests/test_command_surface.py` — handler coverage for every roster command and post_init menu registration (mocked)
- [x] 3.2 Run `make check` from `nedilya-na-vagakh/` and fix any lint/type/test failures
