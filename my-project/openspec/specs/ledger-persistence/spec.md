# Ledger and Persistence Specification

## Purpose

Provide immutable inventory history and a safe JSON repository boundary. Covers FR-35 through FR-39 and NFR-5, NFR-6, NFR-11, and NFR-12.

## Requirements

### Requirement: Movement ledger

Authenticated users SHALL see movements newest-first with timestamp, item, signed quantity, direction, reason, document, and actor (FR-35).

#### Scenario: Ledger ordering
- **GIVEN** movements with distinct timestamps
- **WHEN** the ledger renders
- **THEN** the latest movement appears first and all audit fields are visible

### Requirement: Ledger immutability

The application SHALL expose no movement edit or delete operation (FR-36).

#### Scenario: Application surface
- **GIVEN** an authenticated Admin or Staff user
- **WHEN** viewing or calling supported ledger operations
- **THEN** only read access is available

### Requirement: Serialized atomic persistence

All writes SHALL enter a FIFO in-process critical section and commit through temporary-file replacement (FR-37, NFR-5).

#### Scenario: Concurrent mutations
- **GIVEN** two overlapping write requests
- **WHEN** both modify persistent datasets
- **THEN** they execute in arrival order without lost updates or invalid JSON

### Requirement: Transactional cross-file behavior

The service SHALL validate the full mutation before replacing any participating file and SHALL restore the prior state if commit fails (FR-38).

#### Scenario: Cross-file failure
- **GIVEN** a mutation spanning inventory and movements
- **WHEN** one staged write fails
- **THEN** every original file remains logically consistent and the user receives an actionable error rather than a generic 500

### Requirement: Relational integrity and abstraction

The repository SHALL validate referenced identifiers and be consumed through typed service interfaces rather than UI file access (FR-39, NFR-12).

#### Scenario: Unknown foreign key
- **GIVEN** a record referencing a missing supplier, item, user, BOM, or order
- **WHEN** persistence is attempted
- **THEN** validation rejects it before any file replacement

Domain mutations and calculations SHALL be covered by automated tests (NFR-11).

