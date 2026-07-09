# answer — spec

## MODIFIED Requirements

### Requirement: Infrastructure failures are errors, not refusals

When the LLM provider fails (transport error, HTTP error, or an unusable response), the system SHALL represent this as a controlled error state that is distinct from an honest refusal, and MUST NOT convert it into a refusal `Answer`. A refusal (`found=False`, no error) is a claim that the corpus lacks the answer and SHALL be reserved for that case only.

#### Scenario: LLM outage is not disguised as a refusal

- **WHEN** the answer pipeline runs and the LLM provider fails
- **THEN** the pipeline returns a controlled error state (an explicit error flag, `found=False`, no sources) that is distinct from a refusal, rather than a `found=False` refusal claiming the corpus lacks the answer

#### Scenario: Provider surfaces a typed error

- **WHEN** the LLM endpoint is unreachable or returns a malformed response
- **THEN** the provider raises a typed `LLMError` carrying endpoint and model context, not a raw transport or parsing exception

#### Scenario: Error state does not count as a refusal in eval

- **WHEN** the anti-hallucination eval runs and a question triggers an LLM error
- **THEN** that question is not counted as a successful refusal in the refusal-rate metric
