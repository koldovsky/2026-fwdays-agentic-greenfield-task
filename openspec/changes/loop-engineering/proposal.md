## Why

Repetitive engineering tasks - planning, implementing, testing, and reviewing - are currently driven by manual, ad-hoc prompting. This creates inconsistency, token waste, and no guarantee of the 'Maker != Checker' principle. An Autonomous Software Engineering Loop replaces manual prompting with a deterministic, multi-agent orchestration system that enforces role separation, context minimalism, and state persistence across runs.

## What Changes

- Introduce a **Loop Controller** (`loop-controller.js`) that orchestrates four specialized agents sequentially.
- Define four agent roles with explicit inputs, outputs, and context rules:
  - **Planner** - converts issues/backlog into structured implementation plans.
  - **Builder** - implements code changes guided by the plan.
  - **Tester** - runs and writes automated tests against the Builder's diff.
  - **Reviewer** - audits changes against requirements, coding standards, and the ADR.
- Add a **Documentation Agent** as an optional fifth participant for spec/doc updates.
- Establish **context assembly** rules: static Knowledge, dynamic Memory, and ephemeral Task Context.
- Define **retry policy**, **cost budgets**, **human escalation checkpoints**, and **termination conditions**.
- Persist loop state (Memory) across runs in Markdown or a lightweight store.

## Capabilities

### New Capabilities

- `loop-controller`: Node.js orchestrator that sequences Planner -> Builder -> Tester -> Reviewer and manages loop state, retries, and escalations.
- `planner-agent`: Analyzes issue descriptions and produces structured implementation plans with subtasks and file scope.
- `builder-agent`: Consumes implementation plans and produces code diffs, strictly prohibited from self-verification.
- `tester-agent`: Runs the test suite and writes new tests covering the Builder's changes; returns a pass/fail verdict.
- `reviewer-agent`: Compares the diff against the original issue, coding standards (AGENTS.md), and the architecture (ARCHITECTURE.md) to produce an approval or rejection.
- `context-assembly`: Mechanism for composing minimal, role-scoped prompts from Knowledge (static), Memory (dynamic), and Task Context (ephemeral).
- `loop-memory`: Persistent state store tracking completed work, retry counts, failed attempts, and open decisions across loop runs.

### Modified Capabilities

_(none - this is a greenfield addition)_

## Impact

- **New files**: `loop-controller.js` (orchestrator entry point), `openspec/changes/loop-engineering/` (this change), `.agents/skills/` (per-agent skill definitions).
- **Modified files**: `AGENTS.md` (loop roles section), `ARCHITECTURE.md` (loop data-flow diagram reference).
- **Dependencies**: Node.js >= 18 (already required); no new external npm packages for the core loop.
- **No breaking changes** to the game engine (`example/`) or the project spec (`documentation/project-spec.md`).
