# Change: harden-agentic-loop

## Why

The agentic harness scores strongest on context and specs but weakest on **loop
enforcement (C3)** and **maker ≠ checker evidence (C5)** — both because the practices
exist as *convention/prose* rather than *enforcement/artifact*:

- **No CI.** `yarn lint · build · test` (135 files / ~1284 tests) runs only locally, so
  "green" is not reproducible by anyone but the author.
- **Soft Stop hook.** `current-state-stop-check.sh` only checks the handoff doc was
  touched; it never gates code quality, so a red tree can end a turn.
- **Ephemeral review.** The `checker` / `verifier` subagents run in clean contexts per
  AGENTS.md, but each pass survives only as a sentence in `docs/current-state.md` — there
  is no committed, machine-checkable review artifact per change.

This change turns each into a committed, automated gate.

## What changes

1. **CI workflow** (`.github/workflows/ci.yml`): on push + PR, run
   `install --frozen-lockfile → lint → build → test → check-review-findings`. This is the
   authoritative full gate; the local loop stays fast.
2. **Blocking Stop hook**: `current-state-stop-check.sh` gains a fast, blocking `yarn lint`
   gate (eslint already enforces the FSD import + `shared/lib` purity rules, so this catches
   architecture breakage, not just style) before the existing handoff check. Full `test`
   stays in CI + the `verifier` subagent to keep Stop fast. Hook timeout raised accordingly.
3. **Committed review artifact** (`review-findings.json`): a JSON Schema
   (`.claude/review-findings.schema.json`) + a zero-dependency validator
   (`scripts/check-review-findings.mjs`, wired into CI). The `checker` subagent + the
   `checker-review` skill are updated to emit `review-findings.json` per change (verdict,
   blocker/major/minor counts, findings with cited requirement IDs). This change dogfoods
   its own: `.claude/reviews/harden-agentic-loop.json`.

## Scope / non-goals

- Caps: `.github/`, `.claude/` (hooks, agents, skills, schema, reviews), `scripts/`,
  `package.json`. No `src/` product code, no `docs/` copy beyond the handoff.
- **Non-goal:** presence-enforcement (CI failing when a change *lacks* a findings file) —
  the validator only shape-checks the files that exist. Presence-enforcement is a follow-up
  once the emit convention has settled.
- **Non-goal:** running the full test suite inside the Stop hook (too slow for iterative
  turns; CI owns it).

## Requirement traceability

Process rules in `AGENTS.md` (loop engineering, separation of duties, plan-first) +
`NFR-OBS-01` (no silent failures — a red gate must surface, not pass quietly). No product
FR/NFR behavior changes; no capability spec delta (this is harness tooling, not a product
capability).
