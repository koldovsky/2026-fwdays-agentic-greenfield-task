## ADDED Requirements

### Requirement: Three-layer context model
The context assembly system SHALL compose agent prompts from exactly three non-overlapping layers: Knowledge (static, long-lived), Memory (dynamic, cross-run), and Task Context (ephemeral, per-execution).

#### Scenario: Layers do not bleed into each other
- **WHEN** an agent's context is assembled
- **THEN** each piece of context is tagged with its layer (Knowledge/Memory/Task) and no item appears in more than one layer

### Requirement: Minimal context principle
Each agent SHALL receive only the context items directly relevant to its specific role. Unrelated files, previous agents' reasoning, and out-of-scope documentation SHALL be excluded.

#### Scenario: Planner does not receive Builder history
- **WHEN** the Planner's context is assembled on a retry run
- **THEN** it does not contain the Builder's previous diff or reasoning

#### Scenario: Context size is bounded
- **WHEN** context assembly runs for any agent
- **THEN** total token count stays below the configured per-agent context limit

### Requirement: Retrieval over preloading
Context SHALL be retrieved on demand (retrieval-augmented) rather than preloaded in full. Agents SHALL specify which knowledge they need; the assembler SHALL fetch and inject only those items.

#### Scenario: Agent requests specific architecture section
- **WHEN** the Planner needs only the Reducer section of `ARCHITECTURE.md`
- **THEN** the assembler injects only that section, not the entire file
