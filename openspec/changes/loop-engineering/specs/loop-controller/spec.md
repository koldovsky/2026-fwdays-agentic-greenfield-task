## ADDED Requirements

### Requirement: Sequential agent orchestration
The loop controller SHALL execute agents in the fixed order: Planner -> Builder -> Tester -> Reviewer. Execution of each agent SHALL NOT begin until the previous agent has returned a successful result.

#### Scenario: Happy path execution
- **WHEN** the loop is started with a valid issue description
- **THEN** all four agents execute in sequence and the loop reports success

#### Scenario: Builder output passed to Tester
- **WHEN** the Builder returns a code diff
- **THEN** the Tester receives that diff as its primary input, not the raw issue

### Requirement: Retry on verification failure
The loop controller SHALL retry the Builder-Tester-Reviewer sequence up to a configurable maximum (default: 3) when the Tester or Reviewer returns a failure verdict.

#### Scenario: Tester fails and triggers retry
- **WHEN** the Tester returns testsPassed = false
- **THEN** the loop controller routes back to the Builder with the failure reason, incrementing the retry counter

#### Scenario: Retry budget exhausted
- **WHEN** the retry counter reaches the maximum retry limit
- **THEN** the loop controller stops, logs the failure, and escalates to human review

### Requirement: Human escalation checkpoints
The loop controller SHALL pause and request human approval before proceeding when a high-risk condition is detected (architecture change, security change, cost threshold exceeded, or repeated Reviewer rejection).

#### Scenario: Cost threshold exceeded
- **WHEN** accumulated token usage exceeds the configured cost budget
- **THEN** the loop pauses and emits a human-escalation event with a summary of progress

### Requirement: Configurable cost budget
The loop controller SHALL enforce a maximum token/cost budget per run. It SHALL terminate the loop gracefully if the budget is exceeded, persisting all partial state to Memory.

#### Scenario: Budget remaining logged each step
- **WHEN** each agent completes
- **THEN** the controller logs remaining token budget alongside the agent result