# harness/automations/ — outer-loop, propose-only

The git hooks + CI are the **inner loop**: they fire *on a change* and **block** it (pre-commit, PR).
This dir is the **outer loop**: watchers that fire *on a schedule* (or on demand) to catch drift that
accumulates **with no PR open** — the engine moves, the committed metadata snapshot goes stale, a link
rots, the maturity ratchet slips. The inner loop can't see any of that, because nothing changed *here*.

## Doctrine: propose, never write

Every automation in this dir is **propose-only**. It may read the repo, run the read-only gates, and
**emit a proposal** (a report, a PR comment, an issue) for a human to act on. It must **never**:

- write to the working tree, commit, push, or merge;
- edit `docs/`, code, or the snapshot;
- turn a proposal into an automatic change.

This keeps the outer loop safe to run unattended: the worst a watcher can do is open a noisy issue.
Anything that mutates the repo goes through the normal SPEC-first / test-first / maker≠checker path and
the binding inner loop.

## Why these live in `harness/` (not duplicated per tool)

Automations are **harness-core infrastructure** — like `scripts/`, `evals/`, and `githooks/`, they are
driven by neither Cursor nor Claude in particular (a scheduler or a human runs them). So they are **not**
tool adapters and carry an **explicit exclusion** from the "both `.cursor/` and `.claude/`" rule
(`harness/README.md` governance rule 2; recorded in [`docs/portability.md`](../../docs/portability.md)).

## Contents

| File | What it proposes | Trigger |
|---|---|---|
| [`drift_watch.py`](drift_watch.py) | runs the read-only gates and reports any drift (traceability · links · engine parity · snapshot · maturity ratchet) | `.github/workflows/drift-watch.yml` (cron + manual), or `python harness/automations/drift_watch.py` locally |
| [`ci_triage.py`](ci_triage.py) | maps a failing gate to a likely cause + the exact fix command | piped a gate name / CI log: `... | python harness/automations/ci_triage.py` |
| [`worktrees.md`](worktrees.md) | the git-worktree flow for working **disjoint** slices in parallel without branch thrash | documentation (run by a human) |

Run the drift watcher locally any time:

```bash
python harness/automations/drift_watch.py        # exit 0 = clean, 2 = drift found (a proposal, not a build break)
```
