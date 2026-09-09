## ADDED Requirements

### Requirement: Issue-to-plan conversion
The Planner agent SHALL receive an issue description and produce a structured implementation plan containing: a goal statement, a list of affected files, subtasks with complexity estimates, and acceptance criteria.

#### Scenario: Valid issue produces a plan
- **WHEN** the Planner receives a non-empty issue description and relevant architecture context
- **THEN** it returns a plan with at least one subtask and a clearly stated goal

#### Scenario: Ambiguous issue triggers clarification
- **WHEN** the Planner cannot derive a concrete goal from the issue description alone
- **THEN** it returns a CLARIFICATION_NEEDED status with specific questions instead of a plan

### Requirement: Minimal context loading
The Planner SHALL retrieve only the context directly relevant to the issue: the matching sections of ARCHITECTURE.md, applicable skill definitions from .agents/skills/, and the current loop Memory entry for the issue.

#### Scenario: Only relevant files loaded
- **WHEN** the issue concerns the game engine reducer
- **THEN** the Planner context includes ARCHITECTURE.md reducer section and no unrelated files

### Requirement: Plan serialization
The Planner SHALL output the plan as a structured Markdown document persisted to the change's artifact directory so subsequent agents can consume it deterministically.

#### Scenario: Plan file written before Builder starts
- **WHEN** the Planner completes successfully
- **THEN** a plan.md file exists in the change directory before the Builder agent is invoked