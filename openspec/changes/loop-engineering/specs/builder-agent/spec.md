## ADDED Requirements

### Requirement: Plan-driven implementation
The Builder agent SHALL implement ONLY the changes described in the Planner's plan.md. It SHALL NOT expand scope beyond the listed subtasks without returning to the Planner phase.

#### Scenario: Builder stays in scope
- **WHEN** the plan specifies modifying reducer.ts and adding reducer.test.ts
- **THEN** the Builder's diff touches only those two files (plus any imports they require)

### Requirement: Self-verification prohibition
The Builder SHALL NOT run tests, lint, or verify its own output. All verification is the exclusive responsibility of the Tester and Reviewer agents.

#### Scenario: Builder does not invoke test runner
- **WHEN** the Builder completes implementation
- **THEN** no test runner command appears in the Builder's execution log

### Requirement: Diff output format
The Builder SHALL produce a unified diff (or equivalent structured change list) as its output artifact, persisted to the change directory as diff.md before handing off to the Tester.

#### Scenario: Diff persisted before Tester starts
- **WHEN** the Builder finishes
- **THEN** diff.md exists in the change artifact directory and contains at least one changed file entry

### Requirement: Clean readable code
The Builder SHALL follow the project's coding standards defined in AGENTS.md and the architecture patterns in ARCHITECTURE.md. All existing comments and JSDoc unrelated to the change SHALL be preserved.

#### Scenario: Existing comments preserved
- **WHEN** the Builder modifies a file with existing JSDoc
- **THEN** the resulting diff does not remove any pre-existing comment blocks