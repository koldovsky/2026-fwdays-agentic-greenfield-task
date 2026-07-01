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

The seam SHALL accept an **optional image** input (base64 data + media type). When one or more images
are supplied, the client SHALL send them as image content block(s) placed **before** the text block
in the single user message, so a vision operation is one more call through the same seam — still
exactly **one** `messages` request with the cached system prefix and no chat history, and still no
tool-call loop. When no image is supplied the request is unchanged (a plain text user message), so
existing text callers are unaffected.

#### Scenario: A classification is one request
- **WHEN** the client performs an intent classification
- **THEN** it issues exactly one `messages` request and returns the parsed structured output, with no
  follow-up tool-result round-trips

#### Scenario: A vision call is one request with the image before the text
- **WHEN** the client performs a structured operation with an image supplied
- **THEN** it issues exactly one `messages` request whose user content is an image content block
  (base64 + media type) followed by the text block, on the cached system prefix, with no follow-up
  round-trips and no agent loop

#### Scenario: Text callers are unaffected by the optional image parameter
- **WHEN** the client is called with no image (router, food estimate, metrics)
- **THEN** the request carries a plain text user message exactly as before — the optional image
  parameter changes nothing for text-only operations

### Requirement: Prompt-cached stable system prefix
The client SHALL expose a stable system prefix carried as a cached block (`cache_control:
ephemeral`) so repeated calls reuse it. Volatile per-request content (the user's message, the
resolved date context) SHALL be placed after the cached prefix so it never invalidates the cache.
The prefix SHALL carry the shared **coaching persona and precision-first clarification policy**
([ADR-0015](../../../../docs/adr/0015-coach-persona-precision-first-clarification.md)) as the content
every LLM feature inherits — it is the single place the voice and clarification rule are defined.
With the persona content the prefix SHALL exceed Sonnet 4.6's ~2048-token cache minimum so the cache
is actually effective.

#### Scenario: The system prefix is marked cacheable
- **WHEN** the client builds a request
- **THEN** the stable system prefix block carries `cache_control: { type: "ephemeral" }`, and
  per-message content is appended after it (not interpolated into the prefix)

#### Scenario: Persona and policy live in the shared prefix
- **WHEN** any LLM feature (router, food, reviews, metrics) builds a request
- **THEN** it reuses the same prefix carrying the coaching voice and precision-first policy — the
  persona is defined once, not per-surface

#### Scenario: Cache effectiveness is observable
- **WHEN** repeated requests share the same system prefix
- **THEN** the client surfaces `usage.cache_read_input_tokens` so cache hits can be verified (the
  fattened prefix now exceeds the ~2048-token cache minimum)

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

