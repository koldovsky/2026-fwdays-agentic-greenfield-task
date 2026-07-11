---
name: prd-to-gherkin
description: Create Behavior-Driven Development (BDD) feature files from PRD using Gherkin syntax. Use when the user has a structured PRD and wants to generate Gherkin scenarios. Also use when user says "write feature file from PRD", "generate Gherkin from requirements", "convert spec to BDD" or pastes a requirements/spec document and asks for test scenarios. Groups scenarios by business Rule using the Gherkin Rule: keyword, following BDD best practices from bdd-practices skill.
---

# Workflow

This workflow orchestrates creation or update of Behavior-Driven Development (BDD) feature files based on a Product Requirements Document (PRD).

The parent (the skill user) acts as the orchestrator of a generation workflow:

1. **Determine output path.** Prompt the user for the output directory (default: `docs/bdd-features/`). Use kebab-case matching the feature name for each file, e.g. `docs/bdd-features/feature-name-1.feature`. Supply the output file path to each writer subagent.
2. **Extract and split features.** Read the features from the PRD **Detailed Feature Descriptions** subsection of paragraph 4. Split features among a reasonable number of parallel writer subagents — typically 3–4. Assign one feature per subagent; if a feature has many subfeatures, a single subagent handles the entire feature (all Rules) so the `.feature` file stays cohesive.
3. **Spawn writer subagents.** Start separate `prd-to-gherkin-writer` subagents (@agents/writer.md), each with its assigned feature section text from the PRD and the agreed output file path. The subagents do not gather their own context — the orchestrator supplies everything they need.
4. **Verify output.** Upon completion of all subagent tasks, verify that one `.feature` file has been written per feature. Review each file for:
   - At least one happy path and one error/edge case per Rule
   - Every Scenario carries a test-layer tag (`@web` / `@api` / `@integration`) and an execution-scope tag (`@smoke` / `@regression` / `@wip` / `@future`)
   - Background is used only when ALL scenarios in the file share the same setup
   - No implementation details leak into Given/When/Then steps
5. **Report.** Summarise the generated files, any gaps found in verification, and surface unresolved questions to the user.

### Sub-agent-type tokens

Each writer subagent is spawned with the `prd-to-gherkin-writer` token. The token maps to:

| Token | Subagent | Definition file |
|---|---|---|
| `prd-to-gherkin-writer` | Gherkin Feature File Writer | @agents/writer.md |

### Temp files

| File | Written by | Read by |
|---|---|---|
| `docs/bdd-features/<kebab-feature-name>.feature` | writer subagent (one per feature) | orchestrator (verification); user (final delivery) |

## Subagent Definitions

The writer subagent is defined in a self-contained file under `prd-to-gherkin-features/agents/`. The orchestrator spawns it with the feature section text and output path as its sole context; the subagent never prompts the user for paths or documents the orchestrator already supplies.

- @agents/writer.md

| Subagent | Input files | Output file |
|---|---|---|
| Writer — `prd-to-gherkin-writer` | PRD feature section text (assigned by orchestrator) + @references/bdd-quality-rules.md + @references/test-scenario-tags.md | `docs/bdd-features/<kebab-feature-name>.feature` |
