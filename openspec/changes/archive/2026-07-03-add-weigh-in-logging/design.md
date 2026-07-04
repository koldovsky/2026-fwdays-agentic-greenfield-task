## Context

Foundation (`add-bot-foundation`) shipped: `nedilya-na-vagakh/` runs with allowlist
gate, SQLite `user_settings` / `weigh_ins` tables, and `insert_weigh_in` /
`get_latest_weigh_in` in the repository. No command handlers exist yet beyond the
allowlist. PRD capability `weigh-in` covers `FR-LOG-01` through `FR-LOG-08`.

## Goals / Non-Goals

**Goals:**

- `/вага` prompts for four scale numbers and persists a valid entry.
- `/скасувати` removes the user's latest weigh-in.
- Parsing is pure, unit-tested, and accepts `.` and `,` decimals.
- All user-facing strings are Ukrainian.

**Non-Goals:**

- Comparison deltas after log (`compare` capability).
- Supportive message lines (`messaging` capability).
- Onboarding flow integration (`onboarding` capability).
- Day-of-week restrictions (logging is always allowed per FR-LOG-08).

## Decisions

### 1. Pure parse module `bot/parse.py`

```python
@dataclass(frozen=True)
class ParsedWeighIn:
    weight_kg: float
    fat_pct: float
    muscle_pct: float
    bmi: float

def parse_weigh_in(text: str) -> ParsedWeighIn: ...
class ParseError(ValueError): ...
```

- Trim input; split on whitespace (spaces and newlines collapse via `split()`).
- Normalize commas to dots before `float()`.
- Require exactly four tokens; raise `ParseError` otherwise.
- No range validation in v1 (scale sends plausible values).

**Rationale:** Keeps handlers thin; satisfies NFR-TEST-01 for parse logic.

### 2. Two-step `/вага` flow with `ConversationHandler` or reply-to-state

**Chosen:** `CommandHandler("вага")` sends hint immediately; a `MessageHandler`
(filters.TEXT & ~filters.COMMAND, registered after allowlist) handles the next
message when `context.user_data.get("awaiting_weigh_in")` is true.

**Rationale:** Simpler than full `ConversationHandler` for a single-prompt flow;
onboarding will add its own conversation later.

**Alternative:** Single-message `/вага 72,4 28,5 32,1 24,8` — rejected; PRD implies
prompt then input (FR-LOG-05).

### 3. Handler module `bot/handlers/weigh_in.py`

- `vaga_command` — set `awaiting_weigh_in`, reply with Ukrainian hint + example.
- `weigh_in_message` — if awaiting, parse, persist, clear flag, confirm.
- `skasuvaty_command` — `delete_latest_weigh_in`, confirm or «немає записів».

Register handlers in `main.py` group `0` (after allowlist group `-1`).

### 4. Repository addition

```python
def delete_latest_weigh_in(conn, user_id: int) -> WeighIn | None:
    # fetch latest, DELETE by id, return deleted row or None
```

### 5. Ukrainian copy (constants in handler or `bot/messages.py`)

| Key | Text (draft) |
|-----|----------------|
| Hint | «Надішли чотири числа: вага (кг), жир (%), м'язи (%), BMI. Приклад: `72,4 28,5 32,1 24,8`» |
| Invalid | «Не вдалося розпізнати. Надішли чотири числа, наприклад: `72,4 28,5 32,1 24,8`» |
| Success | «Записано: вага … кг, жир … %, м'язи … %, BMI …» (factual, no deltas yet) |
| Undo ok | «Останній запис скасовано.» |
| Undo empty | «Немає записів для скасування.» |

Use Ukrainian decimal comma in display formatting for confirmation.

### 6. DB connection per handler

Open short-lived connection from `context.bot_data["database_path"]` in each
handler (same pattern as foundation tests). Future refactor can add connection
pooling if needed.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| `awaiting_weigh_in` stale if user sends unrelated text | Clear flag on successful parse or invalid parse; optional timeout later |
| MessageHandler catches all text while awaiting | Only check flag at top of handler; ignore otherwise |
| `/скасувати` with no entries | Return friendly Ukrainian message |

## Migration Plan

Additive — deploy new handlers; no schema migration. Existing DB rows untouched.

## Open Questions

- None blocking. Display formatting for success message can mirror compare capability's
  Ukrainian comma style in a minimal form.
