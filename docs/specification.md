# Specification: LoopLedger

## Problem

Agentic engineering homework is evaluated by evidence of process, not by project
size. That evidence is easy to scatter across chat history, commits, tests, and PR
text. LoopLedger makes the evidence explicit in one small JSON ledger and renders it
as Markdown.

## Users

- A student submitting the fwdays Agentic Engineering homework.
- A reviewer checking whether the submission contains context, loops, verification,
  maker/checker separation, and spec-first thinking.

## Scope

LoopLedger is a dependency-free Python CLI. It can:

- create a project evidence ledger;
- record agentic practices;
- record maker/checker cycles;
- record verification checks;
- record spec-first decisions;
- audit required evidence;
- render a Markdown report for a PR.

## Non-goals

- It is not a project-management system.
- It does not call LLM APIs.
- It does not store secrets or browser/session data.
- It does not replace a real demo video; it creates evidence for the PR description.

## Acceptance Criteria

- `python -m loopledger.cli new examples/tmp.json --name Demo` creates a valid ledger.
- `practice`, `cycle`, `check`, and `decision` commands append records without
  deleting existing records.
- `audit --strict` exits non-zero when required evidence is missing.
- `audit --strict` exits zero when all required evidence is present and checks pass.
- `report` renders a Markdown document containing score, practices, cycles, checks,
  decisions, and missing evidence when relevant.
- Unit tests and evals pass without network access.

## Agentic Engineering Evidence

- Context engineering: `AGENTS.md` contains static rules and dynamic context routing.
- Loop engineering: `docs/agentic-process-log.md` records the implementation loop.
- Verification: `tests/test_loopledger.py` and `evals/evaluate.py`.
- Maker != checker: `docs/checker-review.md` records a separate review pass.
- SDD: this specification constrained implementation before coding.
