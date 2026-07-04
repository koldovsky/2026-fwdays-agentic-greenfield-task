## Context

`foundation` shipped `user_settings` storage and `get_or_create_settings` with defaults
(`display_name` «Оленка», `reminder_time` `09:00`, `Europe/Kyiv`, Sunday). `add-supportive-messaging`
uses `display_name` for name-prefixed copy (FR-MSG-01/02). No `/налаштування` handler exists yet;
`/допомога` does not list it.

PRD capability `settings` covers `FR-SET-01..03`. Onboarding (`FR-ONB-01..02`) and reminders
(`FR-REM-01`) will reuse name validation and reminder-time parsing from this change.

## Goals / Non-Goals

**Goals:**

- `/налаштування` command showing current name and reminder time with actions to change or clear
  name and change reminder time.
- Pure `bot/name_validation.py` with unit tests (NFR-TEST-01).
- Repository helpers to update `display_name` (including NULL) and `reminder_time`.
- Simple multi-step flow via `context.user_data` (same pattern as `/вага` weigh-in await).
- Update `/допомога` to list `/налаштування`.

**Non-Goals:**

- `/start` onboarding conversation (later capability).
- Sunday scheduler / `JobQueue` (later capability).
- Changing `reminder_timezone` or `reminder_weekday` (fixed v1).
- Telegram BotFather command-menu registration (FR-CMD-01 — `commands` polish pass).
- Reminder-time preset buttons (onboarding concern; settings accepts free-form `HH:MM` only).

## Decisions

### 1. Handler module `bot/handlers/settings.py`

Single module with:

```python
SETTINGS_AWAITING_KEY = "settings_awaiting"  # "name" | "reminder_time" | None

async def nalashtuvannya_command(update, context) -> None: ...
async def settings_message(update, context) -> None: ...
```

- `nalashtuvannya_command`: load settings, format summary, attach `InlineKeyboardMarkup` with
  three callbacks: change name, clear name, change reminder time.
- `settings_message`: handle free-text when `SETTINGS_AWAITING_KEY` is set; validate, persist,
  confirm, clear await state.
- `CallbackQueryHandler` for inline button actions (set await state or clear name immediately).

Register in `main.py`:

- `MessageHandler` regex for `/налаштування`
- `CallbackQueryHandler` for settings callbacks (pattern prefix `settings:`)
- `MessageHandler` for `settings_message` when awaiting (group after command handlers, or
  checked inside a shared text handler — prefer dedicated handler with filter on user_data)

**Rationale:** Matches existing weigh-in await pattern; inline keyboards avoid typo-prone command
menus. Callback prefix keeps handlers isolated from future onboarding keyboards.

**Alternative:** `ConversationHandler` — rejected as heavier than needed for two optional text steps.

### 2. Pure name validation `bot/name_validation.py`

```python
class NameValidationError(ValueError):
    ...

def validate_display_name(raw: str) -> str:
    trimmed = raw.strip()
    if not trimmed:
        raise NameValidationError("empty")
    if len(trimmed) > 40:
        raise NameValidationError("too_long")
    return trimmed
```

**Rationale:** Testable pure function; onboarding imports the same module (FR-SET-03).

### 3. Reminder time parsing (inline in settings handler or small helper)

```python
def parse_reminder_time(raw: str) -> str:
    # Accept HH:MM, 24h, hours 00-23, minutes 00-59
    # Return normalized "HH:MM" with zero-padded components
```

Keep in `bot/handlers/settings.py` or `bot/reminder_time.py` if onboarding needs it — prefer
`bot/reminder_time.py` if shared with onboarding in the next change.

For this change, a module-level helper in `settings.py` is acceptable; extract to
`bot/reminder_time.py` during onboarding apply if duplication appears.

**Rationale:** PRD stores `HH:MM` text; no timezone edit in settings.

### 4. Repository extensions

Add to `bot/repository.py`:

```python
def update_display_name(
    conn, telegram_user_id: int, display_name: str | None
) -> UserSettings: ...

def update_reminder_time(
    conn, telegram_user_id: int, reminder_time: str
) -> UserSettings: ...
```

Both UPDATE `user_settings` and return refreshed row via `get_or_create_settings` or SELECT.

**Rationale:** Thin persistence layer; handlers own UX copy.

### 5. Settings summary message

Ukrainian template, e.g.:

```
Налаштування:
Ім'я: Оленка
Нагадування: неділя о 09:00 (Europe/Kyiv)

Обери дію нижче.
```

When `display_name` is NULL:

```
Ім'я: загальні повідомлення (без імені)
```

**Rationale:** Product overview and FR-SET-01/02; timezone shown for clarity but not editable.

### 6. Clear name behavior

Callback «Очистити ім'я» calls `update_display_name(..., None)` immediately (no second prompt).
Confirm: «Ім'я очищено — повідомлення будуть загальними.»

**Rationale:** FR-SET-02 explicit clear action; avoids accidental clear via empty text during rename.

### 7. Interaction with weigh-in await

If `AWAITING_WEIGH_IN_KEY` and `SETTINGS_AWAITING_KEY` could both be set, settings text handler
SHOULD run only when settings await is active; `/налаштування` during weigh-in await cancels
weigh-in await (or vice versa). **Decision:** entering settings clears weigh-in await; starting
`/вага` clears settings await.

**Rationale:** Single-user bot; one conversational edit at a time.

### 8. Tests

| File | Covers |
|------|--------|
| `tests/test_name_validation.py` | FR-SET-03 trim, empty, length |
| `tests/test_settings_handlers.py` | Summary, name update, clear, reminder update, invalid inputs |
| Extend `tests/test_db.py` | `update_display_name`, `update_reminder_time` |
| Extend `tests/test_help_handlers.py` | `/налаштування` in help text |

Mock DB / `Application` patterns from `test_views_handlers.py`.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| User stuck in await state | `/налаштування` re-entry resets menu; `/вага` clears settings await |
| Invalid time formats (e.g. `9:00` vs `09:00`) | Parser accepts single-digit hour; normalize to zero-padded `HH:MM` on save |
| Callback vs text handler ordering | Register `CallbackQueryHandler` before generic text; use explicit user_data keys |
| Clear name vs default «Оленка» | NULL means general messages per PRD; distinct from default onboarding name |

## Migration Plan

Additive — no schema migration. Existing rows keep current values; `/налаштування` works
immediately after deploy.

## Open Questions

- Exact Ukrainian button labels — pick natural short phrases during apply (e.g. «Змінити ім'я»,
  «Очистити ім'я», «Змінити час»).
- Whether to show «неділя» explicitly in summary — **decision: yes** (`reminder_weekday` fixed
  Sunday in v1).
