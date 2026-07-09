# cli — spec

## ADDED Requirements

### Requirement: CLI degrades gracefully on backend failure

The CLI SHALL NOT expose raw tracebacks to the user. When answering a question fails, it SHALL print a readable message; in interactive mode the session SHALL continue. When a required backend is unavailable at startup, the CLI SHALL exit with a clear message and a non-zero status.

#### Scenario: Failed question does not crash the session

- **WHEN** a question fails because the LLM or a backend is unavailable
- **THEN** the CLI prints a readable error message instead of a traceback, and in interactive mode continues accepting further questions

#### Scenario: Unavailable backend at startup

- **WHEN** the CLI starts but a required backend (e.g. the vector store) is unreachable
- **THEN** it prints a clear message and exits with a non-zero status rather than a traceback
