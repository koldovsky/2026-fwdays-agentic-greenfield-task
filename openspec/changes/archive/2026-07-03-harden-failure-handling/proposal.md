# harden-failure-handling — proposal

## Why

A CodeRabbit review of the submission PR surfaced that the shipped capabilities crash on infrastructure failure: an LLM outage or a vector-store blip raised raw tracebacks, killed the CLI/REPL, and could stop the sync watcher entirely. These are **behavioral requirements** (graceful degradation, and preserving the honesty contract) that were never captured in the specs. This change retrofits them into the SDD process: the code fix was applied first as a review hot-fix, and this change backfills the requirements, design, and spec scenarios so the behavior is governed, not ad-hoc.

## What Changes

- **New NFRs** in the PRD: resilience to external-dependency failure, and preserving the "not in corpus" refusal semantics (an outage must never masquerade as an honest refusal).
- **answer** (spec delta): an infrastructure/LLM failure is surfaced as an error, NOT converted into a `found=False` refusal — a refusal means "corpus lacks it", never "backend is down".
- **cli** (spec delta): the CLI degrades gracefully — a failed question prints a friendly message and keeps the REPL alive; an unreachable backend at startup exits with a clear message rather than a traceback.
- **sync** (spec delta): the watch loop survives a transient failed pass (logs and continues) and tolerates invalid interval configuration, so continuous sync cannot be silently killed.

## Capabilities

### Modified Capabilities

- `answer`: add a requirement that infra failures are errors, not refusals.
- `cli`: add a requirement for graceful degradation on backend failure.
- `sync`: add a requirement for watcher resilience to transient failures and bad config.

## Impact

- Spec deltas to `answer`, `cli`, `sync` (new requirements + scenarios).
- New NFRs in `docs/prd.md`.
- Code and tests already landed (llm.py `LLMError`, cli.py boundary handling, sync.py resilient watch + interval validation; +9 tests, suite green at 44). This change documents and governs that work; `tasks.md` reflects it as done.
- No behavior change beyond what already shipped in the hot-fix.
