# project-docs — spec

## ADDED Requirements

### Requirement: README explains and orients

The repository SHALL contain a `README.md` that states what askdocs is, why it exists, and how to run it (quick start, asking questions, running tests and eval), with all commands executed inside Docker.

#### Scenario: Newcomer can get to a first answer

- **WHEN** a newcomer reads `README.md`
- **THEN** it explains the product and gives the commands to launch the system and ask a question, all via Docker

### Requirement: Agent guide documents the workflow and rules

The repository SHALL contain an `AGENTS.md` describing how to work in this repo — the OpenSpec change workflow, the rule to implement only `accepted` requirements and never touch `proposed`, Docker-only execution, the interface boundaries, and the test command. A `CLAUDE.md` SHALL resolve to the same guidance.

#### Scenario: Agent finds the rules of engagement

- **WHEN** an agent reads `AGENTS.md` (or `CLAUDE.md`)
- **THEN** it learns the change workflow, the accepted-only rule, and how to run tests in the container

### Requirement: One-command launch

Running `docker compose up` SHALL bring up the whole system with no additional manual steps: the vector store service and the application indexing the mounted corpus directory.

#### Scenario: System comes up and indexes the corpus

- **WHEN** a user runs `docker compose up` with sample documents in the mounted corpus directory
- **THEN** the vector store service starts and the application indexes the corpus without any further manual command

#### Scenario: Queries run against the launched system

- **WHEN** the system is up and the corpus is indexed
- **THEN** a CLI query returns an answer citing a source file from the corpus
