# llm-client — delta (hardening)

## ADDED Requirements

### Requirement: Explicit bounded transport retry and timeout

The Anthropic client SHALL be instantiated with an explicit bounded retry count and an explicit
request timeout (SDK-native exponential backoff honoring `retry-after` on 429/5xx/connection
errors). A retry SHALL only re-send the **same single deterministic call** — this is transport
resilience, not an agent loop (invariant #5); no retry may branch on model output or add a call
class. A call still failing after the budget SHALL throw to the caller.

#### Scenario: Rate-limited call retries within the budget and succeeds

- **WHEN** `messages.create` receives a 429 and a subsequent attempt within the configured retry
  budget succeeds
- **THEN** the caller receives the structured result as if the first attempt had succeeded
- **AND** exactly one logical LLM operation was performed (no extra call class, invariant #5)

#### Scenario: Exhausted budget surfaces an error

- **WHEN** every attempt within the retry budget fails
- **THEN** `parseStructured` throws and the caller's error path (ultimately the bot error
  boundary) handles it — the process does not hang past the configured timeout

### Requirement: Per-call usage log line

After every structured LLM call, the client seam SHALL log exactly one line containing: a caller
capability label, input tokens, output tokens, cache-read tokens, cache-creation tokens, and
wall-clock duration in milliseconds. The line SHALL contain numbers and the enum-like label only —
never the prompt, the model output, or any user content (invariant #9). This line is the
operational evidence for prompt-cache effectiveness (rule #5), LLM spend (PRD §4 M5), and the LLM
leg of reply latency (M7).

#### Scenario: Usage line emitted with cache evidence

- **WHEN** a structured call completes whose system prefix was already cached
- **THEN** one log line is emitted with the caller's label and a positive cache-read token count

#### Scenario: No content ever logged

- **WHEN** any structured call completes for a message containing personal data
- **THEN** the usage line contains only the label, token counts, and duration — no prompt or user
  text appears in the log
