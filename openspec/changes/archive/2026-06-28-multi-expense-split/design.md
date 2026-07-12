## Context

The parser agent currently returns a single JSON object per call. Users frequently express multiple purchases in one sentence (e.g., "купив каву за 50 і хліб за 30"). Today those inputs either get merged into one record (losing data) or the second purchase is silently dropped.

The project stack is Python with an LLM call chain: user input → parser agent (LLM) → checker (rule-based) → storage (SQLite or similar).

## Goals / Non-Goals

**Goals:**
- Parser agent returns an array of expense objects (1..N) per call.
- Checker validates each element independently and collects all failures.
- Storage layer inserts one row per expense object.
- Datetime inference applies per-expense using the same receipt timestamp.
- Existing single-expense inputs continue to work (output array with one element).

**Non-Goals:**
- Splitting expenses across multiple user messages (each call is still atomic).
- Voice transcription or language detection changes.
- Currency conversion.
- Deduplication across calls.

## Decisions

### 1. Output schema: always return an array

**Decision**: The parser agent always returns a JSON array, even for single-expense inputs (`[{...}]`).

**Rationale**: A uniform return type is simpler to validate and store. Callers never need to branch on "is this an object or array?". Existing evals need minimal changes (wrap gold standard in `[...]`).

**Alternative considered**: Return an object with an `expenses` key and a `count` field. Rejected — unnecessary envelope overhead for a simple array.

### 2. Split detection strategy: single LLM pass

**Decision**: Ask the LLM to detect splits and return all expenses in one response, not in multiple calls.

**Rationale**: A single call is cheaper and simpler. The LLM already understands Ukrainian conjunctions ("і", "та", "плюс", "також") and can infer per-expense fields in context. A second "split detection" call would double latency for no benefit.

**Alternative considered**: First call detects N items, then N parallel calls parse each. Rejected — over-engineered for MVP scale.

### 3. Per-expense datetime: each gets its own inference

**Decision**: Each expense in the array runs through the datetime inference rules independently, all sharing the same injected receipt timestamp.

**Rationale**: A sentence like "купив каву о 14:00 і хліб годину тому" has different datetimes per item. The receipt timestamp is constant (injected once), but relative offsets apply per item.

### 4. Checker: validate-all, report-all

**Decision**: The checker iterates the full array and accumulates all validation errors before returning. It does not stop at first failure.

**Rationale**: Returning all errors lets the LLM (on retry) fix all issues in one shot rather than discovering failures one by one.

## Risks / Trade-offs

- **LLM over-splitting**: The model may split "купив пиво і воду за 30" into two expenses when the user meant a combined 30 UAH total. Mitigation: add a few-shot example of this case in the system prompt with the correct single-expense output.
- **Increased output tokens**: Returning multiple objects costs more tokens. Mitigation: acceptable at MVP scale; revisit if costs spike.
- **Eval dataset churn**: All existing evals need their gold standard wrapped in `[...]`. Mitigation: small dataset, easy one-time migration.

## Open Questions

- Should the retry budget (3 retries) apply per-expense or per-call? Decision deferred; for now, retries are per-call (retry the whole array parse).
