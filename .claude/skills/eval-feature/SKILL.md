---
name: eval-feature
description: LLM-as-judge evaluation of a completed OpenSpec feature. Checks implementation correctness, test quality, tone-mode compliance, and spec coverage. Run after opsx:apply finishes.
---

Evaluate the quality of a recently implemented feature.

**Input**: Optionally specify a change name. If omitted, infer from conversation context or ask the user.

**Steps**

1. **Identify the change**

   Resolve the change name the same way as `openspec-apply-change`. Run:
   ```bash
   openspec status --change "<name>" --json
   ```
   Read the `contextFiles` (spec, design, tasks) to understand the intended behavior.

2. **Collect changed files**

   Run:
   ```bash
   git diff main...HEAD --name-only
   ```
   Read every modified source file and its corresponding test file.

3. **Run tests and capture results**

   ```bash
   npm test 2>&1
   ```
   Record pass count, fail count, and any skipped tests.

4. **Evaluate across four dimensions**

   For each dimension, produce a score: PASS / WARN / FAIL, plus specific line-level findings.

   **Dimension 1 — Spec Compliance**
   - Does every requirement in the spec have a corresponding implementation?
   - Are there any spec requirements with no code path covering them?
   - Are deferred (future) requirements accidentally implemented?

   **Dimension 2 — Test Quality**
   - Do tests assert behavior (outputs, state changes, rendered text), not implementation details (internal function calls)?
   - Are all three Tone Modes exercised where the feature produces tone-adaptive copy?
   - Are edge cases covered: empty state, offline, rapid re-trigger of the STOP flow?
   - Is each test isolated (no shared mutable state between tests)?

   **Dimension 3 — Tone-Mode Compliance**
   - Is all user-facing copy sourced from `lib/<feature>/copy.ts` or a `use-*-copy` hook? No hardcoded strings in components.
   - Does `calm` mode contain zero exclamation marks in its copy entries?
   - Does `high-impact` mode use appropriately assertive language?

   **Dimension 4 — Code Quality**
   - Are touch targets ≥ 44px for any new interactive elements?
   - Is the STOP button color untouched (must stay `#C13515`, mode-invariant)?
   - No `console.log` or debug artifacts left in production paths.
   - TypeScript: no `any` types introduced without justification.

5. **Produce verdict**

   ```
   ## Eval: <change-name>

   | Dimension         | Score | Findings |
   |-------------------|-------|----------|
   | Spec Compliance   | PASS  | — |
   | Test Quality      | WARN  | calm mode copy not tested in SteppPhase1 |
   | Tone Compliance   | PASS  | — |
   | Code Quality      | FAIL  | STOP button overridden in EmergencyModal line 42 |

   **Overall: FAIL**

   ### Required fixes
   1. <file>:<line> — <specific issue>
   2. ...

   ### Suggested improvements (non-blocking)
   - ...
   ```

6. **If verdict is FAIL — fix and re-verify**

   - Apply the required fixes directly
   - Re-run `npm test` to confirm green
   - Re-run this evaluation (steps 3–5) and confirm all dimensions are PASS or WARN
   - Report final clean verdict

7. **If verdict is PASS or WARN-only**

   Summarize findings and suggest `opsx:archive` to close the change.

**Guardrails**
- A WARN does not block archiving; a FAIL does.
- Do not change spec files — only implementation and test files.
- Do not widen the scope beyond files touched by this change.
- If a fix introduces new failures, pause and report rather than cascading.
