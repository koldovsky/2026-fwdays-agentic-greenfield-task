## ADDED Requirements

### Requirement: Verified session boundary

ForgeFlow SHALL authenticate active users, issue and clear signed sessions, protect authenticated routes, and enforce administrator-only mutations (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7).

#### Scenario: Session lifecycle and denial

- **WHEN** tests create, read, clear, or require a session and exercise a Staff admin request
- **THEN** the expected session state, redirect, or Ukrainian authorization error is observed

### Requirement: Verified JSON transaction boundary

ForgeFlow SHALL serialize JSON mutations and leave persisted aggregates unchanged after a failed mutation (FR-37, FR-38, FR-39).

#### Scenario: Concurrent and failed writes

- **WHEN** isolated integration tests run concurrent updates and a failing transaction
- **THEN** both updates persist in FIFO order and the failed transaction changes no file
