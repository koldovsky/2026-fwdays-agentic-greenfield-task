## Context

The parser agent (`src/agent.py`) uses an LLM with a system prompt to produce ISO 8601 datetimes. The LLM has no access to a real clock, so it cannot resolve relative expressions like "годину назад" and cannot accurately set the "no date/time" case to the actual receipt time. The database column is already `TIMESTAMP` — no schema change needed.

The four cases that must be handled:

| User input | Expected datetime |
|---|---|
| Date only (e.g., "вчора") | Midnight of that date |
| Relative time (e.g., "годину назад") | Receipt time minus offset |
| Explicit time (e.g., "о 18:30") | That time (today if no date given) |
| No date/time at all | Receipt timestamp |

## Goals / Non-Goals

**Goals:**
- Correctly resolve relative time expressions by injecting the receipt timestamp.
- Preserve the existing midnight-for-date-only behavior.
- Preserve the existing explicit-time behavior.

**Non-Goals:**
- Timezone awareness — datetimes remain naive (no tzinfo).
- Retroactive correction of existing rows.
- User-facing display changes.

## Decisions

### D1: Inject receipt timestamp into the user message

**Decision**: Pass the current datetime as a single line at the top of every user message: `"Message received at: {now}\nParse this expense: {user_input}"`. The system prompt references this field by name.

**Rationale**: The LLM cannot call `datetime.now()`. Injecting the receipt time is the minimal change that enables correct relative-time resolution and accurate no-date-no-time timestamps.

**Alternative considered**: Post-process the LLM output in Python (detect relative expressions, re-calculate). Rejected — requires duplicating natural-language parsing logic in Python, fragile, and harder to test.

### D2: Midnight stays correct for date-only input

**Decision**: Do not change the midnight rule. When the user writes "вчора" with no time hint, midnight of that date is the semantically correct value — the expense might have happened anytime that day, and midnight is the conventional start-of-day anchor.

**Rationale**: Matches user expectation: date-only = date boundary, not "right now". Only relative and absent time expressions should use the receipt timestamp.

### D3: No validator soft-check for midnight

**Decision**: Remove the proposed midnight soft-check from the validator. Midnight is a valid and expected value for date-only inputs; flagging it would produce false positives on every "вчора" expense.

## Risks / Trade-offs

- **LLM non-determinism** → The model might still misinterpret a relative expression. Tests with mocked `now` will catch regressions.
- **Clock skew** → The injected time is the moment `extract_expense` is called, not the exact moment the user sent the message. For typical bot latencies (< 2 s) this is acceptable.
- **Prompt token cost** → Adding one `Message received at:` line is ~6 tokens per call — negligible.
