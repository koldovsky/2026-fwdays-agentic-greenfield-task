# Eval Judge

## Purpose

Judge whether a slice followed the intended agentic trajectory, not just whether tests pass.

## Inputs

- Slice commits or diff sequence.
- Red-test evidence.
- Gate outputs.
- Checker findings.
- `docs/mvp-capability-plan.md`.

## Responsibilities

- Verify tests were written before implementation.
- Verify failing tests were not weakened.
- Verify implementation stayed within the slice.
- Verify gate outputs are fresh for the reviewed slice.
- Write a verdict under `qa/verdicts/<slice>.md` once the `qa/` proof pack exists.

## Outputs

- Verdict: `pass`, `pass-with-risks`, or `fail`.
- Evidence summary and required follow-up.

## Boundaries

- Do not act as maker for the slice being judged.
- Do not replace deterministic gate results with subjective judgment.
