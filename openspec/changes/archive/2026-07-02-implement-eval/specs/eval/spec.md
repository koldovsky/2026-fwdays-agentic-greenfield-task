# eval — spec

## ADDED Requirements

### Requirement: Golden set of known-answer questions

The system SHALL include a versioned golden set of 20–30 questions over the ГущоЛіт corpus. Each question SHALL be tagged as in-corpus (with the expected source file) or out-of-corpus (expected honest refusal).

#### Scenario: Golden set is loadable and well-formed

- **WHEN** the eval golden set is loaded
- **THEN** it contains 20–30 entries, each with a question and an in-corpus/out-of-corpus tag, and every in-corpus entry names an expected source file that exists in the corpus

### Requirement: Retrieval hit-rate metric

The system SHALL compute a retrieval metric over the in-corpus golden questions: for each question, whether the expected source file appears among the top-k retrieved chunks. The aggregate hit-rate SHALL meet a defined threshold.

#### Scenario: Expected source is retrieved for in-corpus questions

- **WHEN** the retrieval eval runs over the in-corpus golden questions against the ingested corpus
- **THEN** the fraction of questions whose expected source file is in the top-k results meets or exceeds the configured threshold

### Requirement: Anti-hallucination refusal metric

The system SHALL compute an anti-hallucination metric over the out-of-corpus golden questions: for each, whether the full answer pipeline returns an honest refusal rather than a fabricated answer. The aggregate refusal-rate SHALL meet a defined threshold.

#### Scenario: Out-of-corpus questions are refused

- **WHEN** the anti-hallucination eval runs over the out-of-corpus golden questions
- **THEN** the fraction of questions the pipeline refuses (found is false) meets or exceeds the configured threshold

#### Scenario: Honesty eval is skippable without an LLM

- **WHEN** the LLM endpoint is unreachable
- **THEN** the anti-hallucination eval is skipped rather than failing the test suite
