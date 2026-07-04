## Context

`foundation` created `user_settings` with `setup_completed_at` (nullable) and defaults
(`display_name` «Оленка», `reminder_time` `09:00`, `Europe/Kyiv`, Sunday). `get_or_create_settings`
inserts a row on first access but never sets `setup_completed_at`. `settings` and `weigh-in`
capabilities shipped; there is no `/start` handler in `bot/main.py`.

PRD capability `onboarding` covers `FR-ONB-01..05` and `FR-CMD-02`. `reminders` depends on users
having completed setup and a chosen reminder time.

## Goals / Non-Goals

**Goals:**

- `/start` runs a one-time two-step inline-keyboard flow: reminder time, then optional first
  weigh-in.
- Reuse `bot/reminder_time.parse_reminder_time` for custom time entry (same rules as settings).
- «Now» branch delegates to the existing weigh-in await path (`AWAITING_WEIGH_IN_KEY`) and
  comparison/support messaging.
- Persist `setup_completed_at` and final `reminder_time`; ensure `display_name` is «Оленка» on
  completion (FR-ONB-04).
- Skip/dismiss paths apply PRD defaults without blocking the user (FR-ONB-05).
- Completed users get short help on `/start` (FR-CMD-02).
- Handler tests mirroring `test_settings_handlers.py` patterns.

**Non-Goals:**

- Sunday `JobQueue` scheduler (later `reminders` capability).
- Name prompt during onboarding (name defaults to «Оленка»; change via `/налаштування`).
- `ConversationHandler` — use `context.user_data` state keys like settings/weigh-in.
- Telegram BotFather command-menu registration (FR-CMD-01).
- Changing `reminder_timezone` or `reminder_weekday`.

## Decisions

### 1. Handler module `bot/handlers/onboarding.py`

```python
ONBOARDING_STEP_KEY = "onboarding_step"  # "reminder_time" | "custom_time" | "weigh_in" | None
ONBOARDING_CALLBACK_PATTERN = r"^onboard:"

async def start_command(update, context) -> None: ...
async def onboarding_callback(update, context) -> None: ...
async def onboarding_message(update, context) -> None: ...  # custom HH:MM only
```

- `start_command`: if `setup_completed_at` is set → reply with `START_HELP_MESSAGE`; else begin
  step 1 (welcome + reminder-time keyboard).
- `onboarding_callback`: handle preset/skip/custom/weigh-in-now/later actions.
- `onboarding_message`: when step is `custom_time`, parse and save time, advance to step 2.

Register in `main.py`:

- `MessageHandler` regex `/start(?:@\w+)?`
- `CallbackQueryHandler` pattern `^onboard:`
- `MessageHandler` for `onboarding_message` when onboarding awaits custom time (group 0, before
  settings/weigh-in text handlers; each handler returns early unless its await key is active)

**Rationale:** Matches existing await-key pattern; callback prefix `onboard:` isolates from
`settings:` keyboards.

**Alternative:** `ConversationHandler` — rejected as heavier than needed for two steps with
mostly button-driven UX.

### 2. Onboarding state machine

| Step | User sees | Actions |
| ---- | --------- | ------- |
| 1 `reminder_time` | Welcome + «Коли нагадувати у неділю?» | Preset buttons `08:00`, `09:00`, `10:00`; «Свій час» → `custom_time`; «Пропустити» → save `09:00`, go to step 2 |
| 1b `custom_time` | Prompt for `HH:MM` | Text → `parse_reminder_time`; on success save time, go to step 2; on error re-prompt |
| 2 `weigh_in` | «Записати перше зважування зараз?» | «Зараз» → set `AWAITING_WEIGH_IN_KEY`, send weigh-in hint, mark setup complete; «Пізніше» → mark setup complete with confirmation |

`setup_completed_at` is written when step 2 resolves (either branch) or when user dismisses via
skip on step 1 then completes step 2. Step 1 skip only saves reminder time; completion happens at
step 2.

**Rationale:** FR-ONB-01 orders reminder before weigh-in; FR-ONB-03 separates Now/Later;
FR-ONB-05 defaults apply on skip without extra prompts.

### 3. Repository: `complete_onboarding`

Add to `bot/repository.py`:

```python
def complete_onboarding(
    conn,
    telegram_user_id: int,
    *,
    reminder_time: str,
    display_name: str = DEFAULT_DISPLAY_NAME,
    completed_at: str | None = None,
) -> UserSettings:
    # UPDATE reminder_time, display_name, setup_completed_at (ISO UTC)
```

Call from onboarding handler after step 2 (or after «Зараз» before weigh-in await, since setup is
done even if weigh-in fails later).

Optional lighter helper `update_reminder_time` already exists — `complete_onboarding` bundles
final persistence for the flow terminus.

**Rationale:** Single write path ensures `setup_completed_at` and defaults stay consistent.

### 4. «Зараз» (Now) weigh-in integration

On «Зараз»:

1. Call `complete_onboarding(..., reminder_time=<chosen>)`.
2. Clear `ONBOARDING_STEP_KEY`.
3. Set `AWAITING_WEIGH_IN_KEY = True` (reuse `weigh_in.vaga_command` hint text).
4. Clear `settings_awaiting` if set.

Existing `weigh_in_message` handles parsing, persistence, deltas, and support line — no duplicate
logic.

**Rationale:** FR-ONB-03 «log immediately»; weigh-in capability already implements FR-LOG/CMP/MSG.

### 5. Completed `/start` short help

`START_HELP_MESSAGE` — concise Ukrainian variant of help (commands + weigh-in example), distinct
from the longer onboarding welcome. May reuse lines from `HELP_MESSAGE` or import a shared
`format_short_help()` if duplication is annoying.

**Rationale:** FR-CMD-02; avoids re-running setup.

### 6. Interaction with other await states

Entering onboarding (`/start` before completion) clears `settings_awaiting` and
`AWAITING_WEIGH_IN_KEY`. `/вага` and `/налаштування` continue to clear the other flows as today.

**Rationale:** Single-user bot; one conversational edit at a time.

### 7. Preset reminder times

Offer `08:00`, `09:00`, `10:00` as inline buttons plus «Свій час» and «Пропустити».

**Rationale:** FR-ONB-02 requires presets; three morning options cover typical Sunday weigh-in
times; `09:00` is also the skip default (FR-ONB-05).

### 8. Tests

| File | Covers |
| ---- | ------ |
| `tests/test_onboarding_handlers.py` | `/start` new vs completed, presets, skip, custom time valid/invalid, Now/Later, defaults |
| Extend `tests/test_db.py` | `complete_onboarding` sets `setup_completed_at`, `display_name`, `reminder_time` |
| Extend `tests/test_help_handlers.py` | `/start` listed in `/допомога` |

Mock DB / `Application` patterns from `test_settings_handlers.py`.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| User abandons mid-onboarding | `setup_completed_at` stays NULL; next `/start` resumes step 1; partial reminder_time may be saved on preset/skip — acceptable |
| Handler ordering (onboarding vs settings vs weigh-in text) | Each text handler returns immediately unless its await key/step is active |
| «Зараз» then invalid weigh-in | Setup already complete; user can retry via `/вага` |
| Existing row with NULL `setup_completed_at` from pre-onboarding deploy | `/start` runs setup once; defaults already match FR-ONB-05 |

## Migration Plan

Additive — no schema migration (`setup_completed_at` column exists). After deploy, first `/start`
runs onboarding for allowlisted users with NULL `setup_completed_at`. Existing users who already
used the bot get the setup flow once.

## Open Questions

- Exact Ukrainian copy for welcome and buttons — finalize during apply (supportive tone,
  BC-TONE-01).
- Whether step 1 should persist `reminder_time` immediately on preset or only at completion —
  **decision: save on preset/skip/custom success** so a abandoned step-2 user still has their time
  choice if they return mid-flow.
