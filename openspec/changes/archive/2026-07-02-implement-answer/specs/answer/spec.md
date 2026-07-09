# answer — spec

## ADDED Requirements

### Requirement: Answer generation goes through the LLMProvider interface

The system SHALL provide an `LLMProvider` interface ("generate an answer from context") and the answer pipeline MUST NOT depend on the concrete implementation. The v1 implementation SHALL call an OpenAI-compatible chat completions endpoint configured via environment variables.

#### Scenario: Pipeline works with any provider

- **WHEN** the answer pipeline runs with a substitute `LLMProvider` implementation
- **THEN** it produces an `Answer` without any code change outside the provider

### Requirement: Answers are grounded in retrieved chunks with source citations

The answer SHALL be generated only from the retrieved chunks supplied as context, and every found answer MUST carry a non-empty list of source files derived from the fragments the model cited. An answer without a source is a bug.

#### Scenario: Corpus question yields cited answer

- **WHEN** the user asks a question answerable from the corpus
- **THEN** the returned `Answer` has `found=True`, answer text, and `sources` containing the file(s) the answer is based on

#### Scenario: Citation fallback

- **WHEN** the model answers from context but omits citation markers
- **THEN** `sources` falls back to the files of all context fragments rather than being empty

### Requirement: Out-of-corpus questions get an honest refusal

When the provided fragments do not contain the answer, the system SHALL return `found=False` with an honest "цього в документації немає" text and no sources, instead of inventing an answer. This refusal is a valid outcome, not an error.

#### Scenario: Unanswerable question

- **WHEN** the user asks a question whose answer is not in the corpus and the model emits the refusal marker
- **THEN** the `Answer` has `found=False`, refusal text, and empty `sources`, and no exception is raised
