# Agentic Process Log

## 2026-07-07: Assignment Discovery

- Inspected the fwdays course homework page.
- Confirmed the formal requirement: build a small project, use agentic engineering
  practices, open a PR, include a real name, a 1-2 minute demo video link, and a
  description of applied practices.
- Chose a small Python CLI because it can demonstrate the process without hiding
  behind a large product.

## 2026-07-07: Spec Loop

- Wrote `docs/specification.md` before implementation.
- Defined acceptance criteria around evidence recording, auditing, reporting, and
  offline verification.
- Decided to use JSON instead of a database to keep the artifact reviewable in a PR.

## 2026-07-07: Maker Loop

- Implemented the dependency-free core in `src/loopledger/core.py`.
- Implemented the CLI in `src/loopledger/cli.py`.
- Added sample evidence in `examples/agentic-homework.loopledger.json`.

## 2026-07-07: Verification Loop

- Added unit tests for project creation, audit behavior, failed checks, report
  rendering, and CLI flows.
- Added a deterministic eval that validates the sample ledger includes all required
  homework evidence.
- Ran `python -m unittest discover -s tests` and `python evals/evaluate.py`.
- Ran the same commands with system `python3` to check Python 3.9 compatibility.

## 2026-07-07: Checker Loop

- Performed a separate review pass after implementation.
- Recorded findings in `docs/checker-review.md`.
- Iterated on the README and demo script so the PR reviewer can understand the
  product and the engineering evidence quickly.
- Fixed a Python 3.9 compatibility issue in type annotations found during review.
