# STATE.md — the format and how to resume

`loop/latest/STATE.md` (the **current run's** STATE — each run under `loop/runs/<run-id>/` has its own, and
`loop/latest` symlinks to it) is the loop's spine. It is **append-only history**: every gate transition adds a row,
stamped via `scripts/loop-now.sh` (the project's configured timezone, else UTC). On startup the loop reads this file to decide
what to resume. Never rewrite history — append. The file is plain Markdown so a human can review the whole
run at a glance.

STATE is the **durable spine**; the loop also **mirrors each transition to the native task list** (one task
per spec) for live visibility — STATE survives a killed session and drives resume, the task list shows
progress while the loop runs. Keep them in sync: when a spec's STATE resolution becomes `done`/`blocked`,
update its task to completed/blocked.

The **planned** backlog (per-spec Gate-0 verdicts, distilled briefs, journey acceptance, security map, seam-test
obligations) lives separately in **`loop/latest/manifest.md`** — `spec-loop-preflight`'s output. STATE just records
_that_ planning happened and the per-gate outcome; the manifest holds the plan itself. `spec-loop-preflight` also
**selects or mints the run** (sync an in-flight run, start a fresh one over a drained backlog, or clear and restart
— see that skill's "Run lifecycle — sync, new, or clear") and creates/syncs STATE, so running preflight then the
loop leaves the loop a run with a STATE to resume and a manifest to consume.

## Columns (the user-requested shape)

`spec → stage → progress → comment → timestamp (project TZ) → resolution`

- **spec** — the OpenSpec change name (its directory under `openspec/changes/`).
- **stage** — `assess | plan | gate1-implement | gate2-verify | gate3-docs | archive | blocked`. The
  `plan` row carries the planner's **Gate-0** verdict (SOUND, or the gap it is closing) — sourced from
  `loop/latest/manifest.md` when `spec-loop-preflight` ran, or from an inline planner call otherwise; `gate2-verify` covers
  the deterministic suite + the seam tests + the real-stack journeys + the review.
- **progress** — a short concrete phrase or count (e.g. `tasks 4/4 [x]`, `PASS`, `FAIL`).
- **comment** — what actually happened; for failures, the specific errors.
- **timestamp** — exactly what `scripts/loop-now.sh` prints (e.g. `2026-06-28 21:15:03 UTC`).
- **resolution** — `done | no | in-progress | blocked`. `no` marks a failed gate that will retry.

## Template

When the current run's `loop/latest/STATE.md` does not exist, create it with this structure:

```markdown
# Loop STATE

Append-only spine for the spec-loop. Each gate transition adds a row, stamped via
scripts/loop-now.sh (the project's configured timezone, else UTC). The loop reads this on startup to
resume. Do not rewrite history — append.

## Legend

- stage: assess | plan | gate1-implement | gate2-verify | gate3-docs | archive | blocked
- resolution: done | no (failed, will retry) | in-progress | blocked (budget exhausted → triage)
- retry budget: 3 attempts per spec

## Backlog summary

| spec          | current stage | attempt | resolution  |
| ------------- | ------------- | ------- | ----------- |
| <change-name> | assess        | 1       | in-progress |

## Log

### <change-name>

| timestamp (project TZ) | stage | progress          | comment                           | resolution  |
| ----------------------- | ----- | ----------------- | --------------------------------- | ----------- |
| <loop-now>              | plan  | SOUND; plan ready | <task count>; journey: <scenario> | in-progress |

## Triage (needs a human)

Specs that exhausted the retry budget, out-of-scope discoveries, or requests to suppress a rule
(which the loop refuses to do on its own); **Gate-0 findings the loop couldn't safely close on its own**
(dangling contracts — a consumed datum/route/contract with no provider; under-scoped specs that bless
placeholders/fixtures as the acceptance surface); and **orphaned seams the stop-judge found** (a scaffolded
route/placeholder no spec ever filled). These are for `/opsx:propose`/`/opsx:explore`, not the loop.

| timestamp (project TZ) | spec | issue | suggested next step |
| ----------------------- | ---- | ----- | ------------------- |
```

## Worked example (one spec through the loop)

```markdown
### add-app-theme-toggle

| timestamp (project TZ)   | stage           | progress          | comment                                                             | resolution  |
| ------------------------ | --------------- | ----------------- | ------------------------------------------------------------------- | ----------- |
| 2026-06-28 21:15:03 UTC  | plan            | SOUND; plan ready | 4 tasks; journey: toggle persists across reload                     | in-progress |
| 2026-06-28 21:31:10 UTC  | gate1-implement | tasks 4/4 [x]     | added theme state + toggle in app chrome                            | in-progress |
| 2026-06-28 21:44:55 UTC  | gate2-verify    | FAIL              | verify: unused import (one source file); test: persistence assertion failed | no  |
| 2026-06-28 21:52:02 UTC  | gate1-implement | fixes applied     | removed import; persist the preference on change                    | in-progress |
| 2026-06-28 22:03:40 UTC  | gate2-verify    | PASS              | gate green; resume journey green on real stack (no video)           | in-progress |
| 2026-06-28 22:10:12 UTC  | gate3-docs      | PASS              | spec synced to main specs; user docs note added                     | in-progress |
| 2026-06-28 22:12:30 UTC  | archive         | archived          | openspec archive add-app-theme-toggle                               | done        |
```

The spec is `done` only on the `archive` row. Note attempt 1 failed Gate 2 (`resolution: no`), looped back
to Gate 1, and passed on attempt 2 — the history shows the retry, which is the point.

## Resuming

On startup, after the assessment snapshot, read STATE.md and act on the **last row of each spec**:

- last row `resolution: done` on an `archive` stage → spec finished, skip it.
- last row `resolution: blocked` → in triage, skip it (report at the end).
- last row `in-progress`/`no` on a gate → resume that spec. Re-read its `tasks.md` and artifacts to see
  what's actually on disk (the repo is the ground truth; STATE is the index), then continue from the next
  step in the control flow. Carry the recorded `attempt` forward.
- no STATE for a pending change → start it fresh at `plan`.

If a row was written _entering_ a gate but none written _leaving_ it, the run was interrupted mid-gate:
re-run that gate (it's idempotent — re-checking or re-syncing is safe; re-implementing reconciles against
what's already on disk).
