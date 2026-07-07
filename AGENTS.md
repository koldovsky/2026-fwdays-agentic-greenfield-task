# Agent Instructions

## Product Context

This repository contains `loopledger`, a small Python CLI for recording evidence of an
agentic engineering process. The goal is not to build a large product. The goal is to
make the process visible: context, loops, verification, maker/checker separation, and
spec-first decisions.

## Static Rules

- Keep the project dependency-free unless a dependency removes clear complexity.
- Prefer deterministic JSON artifacts over hidden state.
- Any new feature must have at least one unit test or eval fixture.
- CLI commands should fail with actionable messages and preserve existing JSON data.
- Generated reports must be readable in a pull request without extra tooling.

## Dynamic Context

Use `docs/agentic-process-log.md` as the current work log. Update it when the goal,
scope, validation evidence, or review findings change.

## Loop Protocol

1. Spec: update `docs/specification.md` before broad implementation changes.
2. Make: implement the smallest useful behavior.
3. Verify: run `python -m unittest discover -s tests` and `python evals/evaluate.py`.
4. Check: perform a separate review pass and record it in `docs/checker-review.md`.
5. Iterate: fix only issues related to the goal, then rerun verification.

## Maker vs Checker

The maker may implement code and docs. The checker must read the diff as if it came
from someone else and look for missing evidence, brittle behavior, or untested paths.
