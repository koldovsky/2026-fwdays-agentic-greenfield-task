---
name: write-bdd-tests
description: Behavior-driven test generation with a planner→writer→verifier refinement loop.
---

# Instructions

Generate behavior-driven test files that focus on public API and observable behavior.

## Input data

1. The path to the source code of component under test (or a snippet of the source file);
2. (Optionally) The Gherkin feature file (or a snippet) describing the flows to be tested.
3. (Optionally) Description of the feature with reference to PRD.

### Sub-agent-type tokens

| Token | Subagent | Definition file |
|---|---|---|
| `bdd-test-planner` | Test planner | @agents/bdd-test-planner.md |
| `bdd-test-writer` | Test writer (splittable by module/level/subproject) | @agents/bdd-test-writer.md |
| `pom-writer` | Page Object Model writer (enforces active-component auto-scroll, pattern #11) | @agents/pom-writer.md |
| `test-verifier` | Test run verifier (per scope) | @agents/test-verifier.md |

### Temp files

| File | Written by | Read by |
|---|---|---|
| The Test Plan file (default `docs/TEST-PLAN.md`) | bdd-test-planner | orchestrator; bdd-test-writer; test-verifier |
| `TEST-VERIFY-<scope-token>-<iteration>.md` | test-verifier | orchestrator (verdict); bdd-test-writer on the next pass (improvement notes) |
| POM and test source files | pom-writer / bdd-test-writer | (written into the codebase as outputs, not temp files) |

## Task

0. If not specified, ask the user for the test plan path (default `docs/TEST-PLAN.md`); once confirmed, note it down in `AGENTS.md`.
1. Read the source files and the Gherkin feature file.
2. Assess the current test codebase state; search for existing tests covering this behavior. If the existing tests reasonably cover the behavior, report this and exit (do NOT attempt to update or rewrite the tests unless explicitly instructed to do so).
3. In case any changes to the existing codebase are necessary, run the `bdd-test-planner` subagent and provide it with your research findings, relevant snippets of the source code, and/or the Gherkin feature file or PRD snippet as available. The planner writes the Test Plan.
4. Once all tests have been planned, proceed with implementation:
   - In case e2e tests were planned: ensure that respective POM classes are present. If not, run a `pom-writer` subagent to implement them first.
   - Run the `bdd-test-writer` subagents, splitting the work as appropriate, e.g. by module/component, by test level, by subproject, etc. Typically no more than 4 subagents.

## Test verification loop

The loop body is: writer subagent(s) → test run (the orchestrator runs the test command) → `test-verifier` subagent (per scope: `subproject` / `test-level` / `component-module`) → verdict → (if NEEDS-FIXES) feed the verifier's improvement notes back to the writer subagents → repeat. The rules below harden the loop against non-convergence, subagent crashes, and fragile verdict parsing.

1. **Max-iteration cap.** The loop runs at most `MAX_ITERATIONS` (default 5). If the cap is reached without CONVERGED, the orchestrator delivers the latest Test Plan with a top-of-file `> CONVERGENCE-NOT-REACHED — outstanding test cases below` banner listing the outstanding `Pending`/`Broken` items, and surfaces them to the user in one consolidated prompt. Do not loop past the cap.
2. **Subagent-failure handling.** If a WRITER or pom-writer subagent fails (crash, timeout, or no output file produced), HALT and surface the error to the user — do not silently retry-loop a writer. If the test-verifier subagent fails or emits no parseable `VERDICT:` line, RETRY it once; if it still fails, EXCLUDE its scope from the overall verdict and record the exclusion (a `TEST-VERIFY-<scope-token>-<iteration>.SKIPPED.md` note) so the run can proceed with the surviving scopes. If ALL verifier scopes fail in an iteration, treat the iteration as NEEDS-FIXES with a `verifier-unavailable` note and re-run the writers with that note rather than silently passing.
3. **Machine-readable verdict.** Each test-verifier MUST emit a final line `VERDICT: <CONVERGED|NEEDS-FIXES>`. The orchestrator parses it with the regex `^VERDICT:\s*(CONVERGED|NEEDS-FIXES)`; the human-readable per-case notes are for the writer only and are NOT parsed for control flow.
4. **Overall verdict.** The iteration's overall verdict is the LOWEST verdict across all verifier scopes, ordered `NEEDS-FIXES < CONVERGED` (i.e. any scope NEEDS-FIXES ⇒ iteration NEEDS-FIXES).
5. **CONVERGED semantics.** CONVERGED is reached when every test case in scope is `Full`, OR `Partial` (planned to cover a feature not yet built — planner-set), OR `Stale` (planner-marked). Any `Pending` or `Broken` case ⇒ NEEDS-FIXES.
6. **Termination.** The loop terminates when every verifier scope's verdict is `CONVERGED`, OR the max-iteration cap is reached (whichever comes first).

## Subagent Definitions

The planner, writer, pom-writer, and verifier subagents are defined in self-contained files under `write-bdd-tests/agents/`. The orchestrator spawns them with the temp/source files above as their only context; the subagents never prompt the user for paths or documents the orchestrator already supplies.

- @agents/bdd-test-planner.md
- @agents/bdd-test-writer.md
- @agents/pom-writer.md
- @agents/test-verifier.md

`bdd-test-planner` and `test-verifier` load the shared Test Plan schema via @references/test-plan-template.md; `pom-writer` loads the existing POM guideline references via @../references/playwright-typescript-page-object-model.md and @../references/pom-playwright-typescript-patterns.md;
`bdd-test-writer` loads @../references/pytest-bdd.md and @../../.agents/skills/e2e-testing-patterns/SKILL.md per the stack/level decision in its own definition file.

| Subagent | Input files | Output file |
|---|---|---|
| `bdd-test-planner` | research findings + source path/snippet + Gherkin/PRD snippets (orchestrator-supplied) + @references/test-plan-template.md | Test Plan file at the supplied path (default `docs/TEST-PLAN.md`) |
| `bdd-test-writer` | Test Plan path + source code path for modules/components/levels in scope + prior `TEST-VERIFY-*` improvement notes on re-runs + @../references/pytest-bdd.md (for Python pytest tests) + @../../.agents/skills/e2e-testing-patterns/SKILL.md (for TS/React/Next.js E2E web tests) | test source files written into the codebase |
| `pom-writer` | page source path/snippet + Gherkin feature file + @../references/playwright-typescript-page-object-model.md + @../references/pom-playwright-typescript-patterns.md | Locator `<Feature>Locators` and Page Object `<Feature>Page` classes written into the codebase |
| `test-verifier` | Test Plan path + scope token + test run output/log location (all orchestrator-supplied) + @references/test-plan-template.md | Test Plan (Status/Note updated in place) + `TEST-VERIFY-<scope-token>-<iteration>.md` ending with `VERDICT: <CONVERGED|NEEDS-FIXES>` |
