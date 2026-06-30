## MODIFIED Requirements

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
