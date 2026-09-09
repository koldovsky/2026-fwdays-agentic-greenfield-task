## ADDED Requirements

### Requirement: Persistent state across runs
The loop memory store SHALL survive process restarts and persist: completed work items, failed attempts with reasons, retry counts per task, and open decisions/blockers.

#### Scenario: Memory survives restart
- **WHEN** the loop controller is stopped mid-run and restarted
- **THEN** the new run reads the previous state and does not re-execute already-completed steps

### Requirement: Memory written at each phase boundary
The loop controller SHALL update the memory store after each agent completes, not only at loop end. Partial state MUST be recoverable if the loop terminates unexpectedly.

#### Scenario: Crash after Builder succeeds
- **WHEN** the process crashes after the Builder completes but before the Tester runs
- **THEN** restarting the loop resumes from the Tester step, with the Builder's diff still available

### Requirement: Memory storage format
Memory SHALL be stored in human-readable Markdown by default, enabling manual inspection and editing without specialized tooling.

#### Scenario: Memory file is readable without tooling
- **WHEN** a developer opens `loop-memory.md`
- **THEN** they can understand the current loop state, retry history, and open decisions without running any commands

### Requirement: Memory pruning
Memory entries older than a configurable retention period (default: 30 days) SHALL be automatically archived to prevent unbounded growth.

#### Scenario: Old entries archived
- **WHEN** the loop runs and finds memory entries older than the retention period
- **THEN** those entries are moved to an archive file and removed from the active memory store
