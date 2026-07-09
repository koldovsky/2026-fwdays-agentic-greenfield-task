# cli — spec

## ADDED Requirements

### Requirement: CLI answers a question with its sources

The system SHALL provide a command-line interface that takes a user question and prints the generated answer followed by the list of source files the answer is based on.

#### Scenario: Question answerable from corpus

- **WHEN** a user runs the CLI with a question answerable from the ingested corpus
- **THEN** the output contains the answer text and a list of the source file paths it cites

#### Scenario: Sources are shown for every found answer

- **WHEN** the CLI produces a found answer
- **THEN** at least one source file path is displayed, because an answer without a source is a bug

### Requirement: CLI surfaces honest refusals

When the answer is not in the corpus, the CLI SHALL display the honest refusal and clearly indicate that there are no sources, rather than fabricating an answer or hiding the empty result.

#### Scenario: Out-of-corpus question

- **WHEN** the CLI is asked a question whose answer is not in the corpus
- **THEN** the output shows the refusal text and explicitly indicates no sources
