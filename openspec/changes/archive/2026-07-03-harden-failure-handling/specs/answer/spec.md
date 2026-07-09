# answer — spec

## ADDED Requirements

### Requirement: Infrastructure failures are errors, not refusals

When the LLM provider fails (transport error, HTTP error, or an unusable response), the system SHALL surface this as an error and MUST NOT convert it into an honest-refusal `Answer`. A refusal (`found=False`) is a claim that the corpus lacks the answer and SHALL be reserved for that case only.

#### Scenario: LLM outage is not disguised as a refusal

- **WHEN** the answer pipeline runs and the LLM provider raises a failure
- **THEN** the failure propagates as an error rather than being returned as a `found=False` refusal

#### Scenario: Provider surfaces a typed error

- **WHEN** the LLM endpoint is unreachable or returns a malformed response
- **THEN** the provider raises a typed `LLMError` carrying endpoint and model context, not a raw transport or parsing exception
