# llm-client

## Purpose

The single seam through which every Anthropic model call passes. It enforces the project's hardest
cost rule — **no agent loop** (invariant #5): one deterministic request with structured output, on a
prompt-cached stable system prefix. Every later LLM feature reuses it.

## Requirements

### Requirement: Single-call, no-agent-loop client
The LLM client SHALL wrap the Anthropic SDK as the single seam through which all model calls pass.
Each operation SHALL be **one** request returning a structured result — never an autonomous
tool-call loop (invariant #5). The client SHALL use the model `claude-sonnet-4-6` and read
`ANTHROPIC_API_KEY` from the validated config (env only — invariant #9).

#### Scenario: A classification is one request
- **WHEN** the client performs an intent classification
- **THEN** it issues exactly one `messages` request and returns the parsed structured output, with no
  follow-up tool-result round-trips

### Requirement: Prompt-cached stable system prefix
The client SHALL expose a stable system prefix carried as a cached block (`cache_control:
ephemeral`) so repeated calls reuse it. Volatile per-request content (the user's message, the
resolved date context) SHALL be placed after the cached prefix so it never invalidates the cache.

#### Scenario: The system prefix is marked cacheable
- **WHEN** the client builds a request
- **THEN** the stable system prefix block carries `cache_control: { type: "ephemeral" }`, and
  per-message content is appended after it (not interpolated into the prefix)

#### Scenario: Cache effectiveness is observable
- **WHEN** repeated requests share the same system prefix
- **THEN** the client surfaces `usage.cache_read_input_tokens` so cache hits can be verified (noting
  Sonnet 4.6's ~2048-token cache minimum — a prefix below it will not cache)

### Requirement: Deterministic structured output
Operations that have a ground-truth answer (classification, parsing) SHALL run at `temperature: 0`
with a JSON-schema-constrained output, so results are reproducible and code-gradeable.

#### Scenario: Classification is deterministic
- **WHEN** the same message is classified twice with the same prefix
- **THEN** the request uses `temperature: 0` and a constrained output schema (residual model
  variance is absorbed at the eval layer, not by re-prompting)

#### Scenario: Empty or refused output fails loud
- **WHEN** the model returns no usable text (e.g. a refusal or a truncated `max_tokens` response)
- **THEN** the client throws an error naming the stop reason rather than attempting to parse an empty
  string
