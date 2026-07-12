## 1. Update Parser Agent Prompt

- [x] 1.1 In `src/agent.py`, update the `SYSTEM_PROMPT` datetime inference rules to match all four cases:
  - Explicit time → use it
  - Relative time (e.g., "годину назад") → compute from "Message received at" timestamp
  - Date only, no time → midnight of that date
  - No date/time at all → use "Message received at" timestamp
- [x] 1.2 In `extract_expense()`, capture `datetime.now()` at call time and prepend it to the user message: `f"Message received at: {now.isoformat()}\nParse this expense: {user_input}"`

## 2. Update Documentation

- [x] 2.1 In `AGENTS.md` under "Datetime Inference", replace the two-case rule with the four-case table matching the spec

## 3. Update Tests

- [x] 3.1 Add a test: relative time input "годину назад" with mocked `datetime.now` → parsed datetime is `now - 1 hour`
- [x] 3.2 Add a test: no date/time input with mocked `datetime.now` → parsed datetime equals mocked `now`
- [x] 3.3 Verify existing test for date-only input ("вчора") still asserts midnight — no change expected
- [x] 3.4 Verify existing test for explicit time input still asserts the user-specified time — no change expected
