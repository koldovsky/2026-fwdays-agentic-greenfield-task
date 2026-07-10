## ADDED Requirements

### Requirement: Pluggable LLM provider port
The system SHALL access the LLM only through a provider port with a streaming
interface, defaulting to a Claude adapter (latest Claude model) and supporting an
optional ChatGPT adapter selected by configuration. The port SHALL live in
framework-free `shared/lib` with SDK calls isolated in adapters, and SHALL NOT
include user IDs or identifying metadata in request payloads. Implements
TC-STACK-03, NFR-SEC-02.

#### Scenario: Default provider is Claude
- **WHEN** no provider override is configured
- **THEN** the agent uses the Claude adapter with the latest Claude model

#### Scenario: Provider swapped to ChatGPT
- **WHEN** the provider config selects ChatGPT
- **THEN** the same agent loop runs unchanged against the ChatGPT adapter

#### Scenario: No identifying metadata sent
- **WHEN** any skill calls the provider
- **THEN** the request payload contains no user ID or account metadata

### Requirement: Skills-based tailoring loop
The system SHALL run tailoring as a bounded plan/act/observe loop over a registry
of skills (`parse-cv`, `extract-requirements`, `generate-bullet`, `ground-bullet`,
`score`), advancing the tailoring state until every requirement has a grounded,
scored bullet or the loop exhausts its step cap. Enqueuing a tailoring SHALL show a
visible progress state (queued → processing → done). Implements FR-TAILOR-01,
FR-BULLETS-01.

#### Scenario: Loop produces a complete tailoring
- **WHEN** a tailoring runs with a CV and a JD
- **THEN** the loop sequences the skills and returns a result where each requirement has a scored bullet carrying a grounding indicator

#### Scenario: Progress is visible
- **WHEN** a user starts a tailoring
- **THEN** they see a queued → processing → done progress state, not a frozen or blank screen

### Requirement: Structural grounding isolation
The system SHALL construct the `ground-bullet` skill's context with only the
candidate bullet and the CV text; it SHALL NOT receive the job description, the
extracted requirements, or the generation transcript. A bullet the grounding step
cannot back in the CV SHALL be marked `overclaim-risk`. Grounding is a separate LLM
pass and MUST NOT share context with generation. Implements FR-BULLETS-03,
BC-HONESTY-01.

#### Scenario: Grounding cannot see generation context
- **WHEN** the loop invokes `ground-bullet`
- **THEN** its context includes only the bullet and CV text, with no JD, requirements, or generation-pass content available

#### Scenario: Unbacked bullet flagged
- **WHEN** the grounding step finds no CV evidence for a bullet
- **THEN** the bullet is marked `overclaim-risk`

### Requirement: Overclaim excluded by default
The system SHALL exclude `overclaim-risk` bullets from export by default; they
cannot be silently re-included and require an explicit user acknowledgement to add
back. Implements FR-BULLETS-02, BC-HONESTY-02.

#### Scenario: Overclaim not exported unless acknowledged
- **WHEN** a result containing an `overclaim-risk` bullet is exported without acknowledgement
- **THEN** that bullet is omitted from the export

### Requirement: Deterministic scoring skill
The `score` skill SHALL compute the checklist statuses and 0–100 match score using
the existing pure `shared/lib/scoring` functions with no LLM call. Implements
FR-CHECKLIST-01, TC-PURE-01.

#### Scenario: Score is deterministic
- **WHEN** the `score` skill runs on the same requirements and CV profile twice
- **THEN** it returns the identical checklist statuses and match score, computed without an LLM call

### Requirement: Streaming performance
The system SHALL stream the tailoring result: the first token reaches the client
within 3 seconds of the job starting (p95) and the full result within 30 seconds
(p95). Implements NFR-PERF-01, NFR-PERF-02, FR-TAILOR-02.

#### Scenario: First token streams quickly
- **WHEN** a tailoring job begins producing output
- **THEN** the client begins receiving tokens within 3 seconds (p95) rather than waiting for the full payload

### Requirement: Fail-honest retry
The system SHALL retry a failed LLM or skill step up to two times; on continued
failure it SHALL surface a calm Ukrainian error state and SHALL NOT render a blank,
partial, or hallucinated result. Failed attempts SHALL NOT be charged. Implements
FR-TAILOR-03, NFR-OBS-01.

#### Scenario: Retries then calm failure
- **WHEN** a skill's LLM call fails three times in a row
- **THEN** the loop stops, a calm Ukrainian error message is shown, no partial result is rendered, and the attempt is not charged
