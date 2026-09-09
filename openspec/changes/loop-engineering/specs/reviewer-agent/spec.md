## ADDED Requirements

### Requirement: Multi-source review
The Reviewer agent SHALL evaluate the Builder's diff against: (1) the original issue description, (2) the Planner's plan.md, (3) coding standards in AGENTS.md, and (4) architectural patterns in ARCHITECTURE.md.

#### Scenario: Diff satisfies all sources
- **WHEN** the diff implements all plan subtasks without violating coding standards or architecture
- **THEN** the Reviewer returns a verdict of approved

#### Scenario: Coding standard violation detected
- **WHEN** the diff contains a TODO comment or silent error catch
- **THEN** the Reviewer returns a verdict of rejected citing the specific violation

### Requirement: Rejection routes back to Builder
The Reviewer SHALL provide precise, actionable feedback in its rejection report so the Builder can fix the identified issues without replanning.

#### Scenario: Feedback is actionable
- **WHEN** the Reviewer rejects a diff
- **THEN** the rejection report contains file names, line references, and the specific rule violated

### Requirement: Independence from Builder
The Reviewer SHALL NOT have access to the Builder's reasoning or internal context. Its inputs are limited to: the issue description, the plan, the diff, and the project's static reference documents.

#### Scenario: Reviewer context does not include Builder chain-of-thought
- **WHEN** the Reviewer begins its task
- **THEN** no Builder reasoning text appears in the Reviewer's input context

### Requirement: Review report persistence
The Reviewer SHALL write its verdict and rationale to review-report.md in the change directory.

#### Scenario: Report persisted before loop finalizes
- **WHEN** the Reviewer completes
- **THEN** review-report.md exists with a verdict field and at least one rationale line