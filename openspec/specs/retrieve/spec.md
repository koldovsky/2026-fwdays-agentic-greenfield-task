# retrieve

## Purpose

Given a user question, return the most relevant chunks from the vector store with source metadata and similarity scores, through the `Retriever` interface. Covers PRD FR-010.

## Requirements

### Requirement: Retrieval goes through the Retriever interface

The system SHALL provide a `Retriever` interface ("find relevant chunks for a question") and code above it MUST NOT depend on the concrete implementation. The v1 implementation SHALL be vector retrieval over the vector store populated by ingest.

#### Scenario: Consumer sees only the interface

- **WHEN** a consumer calls `retrieve(question, k)` on a `Retriever`
- **THEN** it receives retrieved chunks without importing or referencing the vector store client or embedding library

### Requirement: Question returns relevant chunks with metadata and score

Given a user question, the retriever SHALL embed it with the same embedding provider used at ingest, search the vector store, and return the top-k most similar chunks. Each returned chunk MUST carry its text, source metadata (source path, heading trail, chunk index), and a similarity score.

#### Scenario: Question about corpus content finds the right file

- **WHEN** the fixture corpus is ingested and the user asks a question whose answer is in a known file
- **THEN** the top-k retrieved chunks include at least one chunk whose `source_path` is that file

#### Scenario: Retrieved chunk carries citation metadata and score

- **WHEN** any question is retrieved against a non-empty store
- **THEN** every returned chunk has non-empty text, a source path, a heading trail, a chunk index, and a similarity score

### Requirement: Retriever does not decide answerability

The retriever SHALL always return up to k results ordered by similarity and SHALL NOT filter by a relevance threshold; judging whether the context is sufficient is the responsibility of the answer capability.

#### Scenario: Out-of-corpus question still returns scored results

- **WHEN** the user asks a question unrelated to the corpus and the store is non-empty
- **THEN** the retriever returns up to k chunks with their scores rather than an empty result or an error
