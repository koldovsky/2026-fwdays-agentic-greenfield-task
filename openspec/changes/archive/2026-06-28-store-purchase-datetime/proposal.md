## Why

The parser agent has no access to the current time, so it cannot correctly resolve relative time expressions like "годину назад" or "2 години тому". It also cannot set "no date/time" expenses to the actual message receipt time. Injecting the message receipt timestamp into the prompt fixes both cases without changing the correct midnight-fallback for date-only inputs.

## What Changes

- Inject the current message receipt timestamp into every LLM call so the model can compute relative time expressions.
- Clarify the datetime inference rules in the system prompt:
  - Date only (e.g., "вчора") → midnight of that date *(keep existing behavior)*
  - Relative time (e.g., "годину назад") → compute from the injected receipt time
  - Explicit time → use as-is *(keep existing behavior)*
  - No date/time at all → use the injected receipt time *(was already the intent, now reliable)*
- Update `AGENTS.md` behavior documentation to match.

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `expense-datetime-inference`: Clarify and enforce the four-case datetime inference rule; inject receipt time so relative expressions can be resolved correctly.

## Impact

- `src/agent.py` — system prompt updated; receipt time injected into user message
- `AGENTS.md` — behavior documentation updated
- `tests/` — add tests for relative time resolution; date-only midnight behavior stays the same
