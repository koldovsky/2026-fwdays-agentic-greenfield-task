# Agent Routing

## Principles

- Maker and checker must be different agents or fresh-context passes.
- Route by task risk, not by convenience.
- Use the smallest model tier that can reliably satisfy the artifact.
- Preserve handoff artifacts in the repository; do not rely on chat memory.

## Model Tiers

| Tier | Use For | Roles |
| --- | --- | --- |
| Frontier/high-thinking | Architecture, ambiguous requirements, adversarial review, trajectory judgment | requirements-analyst, spec-writer, code-reviewer, security-reviewer, spec-compliance-auditor, eval-judge |
| Mid-tier implementation | Well-specified C# slices with red tests already present | capability-implementer |
| Fast/mechanical | Formatting, boilerplate docs, simple file moves, generated config edits | support work only |

## Slice Handoff

1. Requirements analyst confirms the PRD IDs and open questions.
2. Spec writer updates OpenSpec for the current slice and runs strict validation.
3. Test engineer writes red tests from the scenarios and records the failing command.
4. Capability implementer makes the smallest green implementation.
5. Code reviewer reviews correctness and architecture boundaries.
6. Security reviewer checks permissions, file handling, offline behavior, and secrets.
7. Spec compliance auditor maps behavior back to requirement IDs and scenarios.
8. Eval judge reviews trajectory evidence and writes a verdict when proof-pack folders exist.

## Required Inputs Per Slice

- `docs/current-state.md`
- `docs/mvp-capability-plan.md`
- `docs/requirements.md`
- Relevant `openspec/specs/**/spec.md`
- Relevant red tests
- Gate output summary

## Stop Conditions

- Requirement conflict or missing model-contract fact.
- Tests cannot be made red for the expected reason.
- Core needs a MAUI/platform dependency.
- Evals require changing `model.onnx`, `labels.txt`, or baselines without user approval.
- G1, G3, or final PR review is pending user approval.
