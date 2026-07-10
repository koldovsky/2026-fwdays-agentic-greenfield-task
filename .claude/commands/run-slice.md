---
description: Run one ratified slice through the maker/checker/judge loop (test-first, gated, capped, judged once)
argument-hint: <NNN | openspec-change-name>
---

# /run-slice — the slice loop orchestrator

Run the slice named by `$ARGUMENTS` (a `docs/specs/NNN-*.md` slice id, e.g. `002`, or its
OpenSpec change name) through this repo's maker/checker/judge loop. **You are the
orchestrator.** You invoke each sub-agent **as a fresh sub-agent with its own isolated
context**, and you drive control flow. This isolation is the mechanism behind
`maker != checker != judge`: no agent inherits another's reasoning, so a review is
genuinely independent, not the author re-grading themselves.

Read `AGENTS.md` (roles, Verify, Definition of Done, reporting rules) and
`openspec/README.md` (the per-slice flow) before you begin.

## Invariants (hold these the entire run)

- **The orchestrator drives; agents return verdicts up.** Sub-agents never call or command
  one another. Each returns a verdict/findings to you; **you** decide the next step.
- **Every step is a fresh sub-agent.** The handoff between steps is the **artifact** — the
  RED tests, the diff, the `[BLOCKING]` findings, the trajectory diagnosis — never shared
  conversation memory. Pass the artifact explicitly into the next agent's prompt.
- **Never weaken the bar to force green.** Weakening, skipping, or deleting a test to pass
  a gate is a process violation the trajectory-eval is built to catch — it fails the
  slice; it does not pass it.
- **No destructive action on an LLM verdict.** You never `git reset`, revert, or discard
  work because a reviewer or the trajectory-eval said FAIL. Findings route to the
  implementer as **rework**; history is the engineering trail.

## Roster (all in `.claude/agents/`)

| Step | Agent | Role | Access |
| --- | --- | --- | --- |
| tests | `test-engineer` | RED tests from the acceptance checks | writes tests only |
| implement / rework | `capability-implementer` | product code + migrations to green | read/write |
| review | `code-reviewer` | correctness of the diff | read-only |
| review | `security-reviewer` | secrets/auth/isolation/injection | read-only |
| trajectory-eval | `eval-judge` + `evals/rubrics/trajectory-quality.md` | did the *process* hold (test-first, no weakening, in scope)? | read-only |
| done | Judge (you, once, at the end) | Definition of Done | — |

## Preconditions (STOP if unmet)

1. **The owner has ratified the spec/change.** Per `openspec/README.md`, a slice starts as
   an OpenSpec change that the **owner approves** (the analogue of the `brainstorming` hard
   gate), and `openspec validate <change> --strict` passes. Confirm:
   - `docs/specs/NNN-*.md` exists with `Status: ratified` (or the owner has said so), and
   - its OpenSpec change validates.
   If the spec/change is **not** ratified, **STOP and ask the owner to ratify it first.**
   Do not brainstorm, invent, or self-ratify a spec inside this command.
2. A clean-enough working tree on a dedicated slice branch (`feat/NNN-...`). No commits to
   `main`.

## The loop

### Step 0 — RED tests (pre-loop)

Spawn `test-engineer` with the spec path, its OpenSpec scenarios, and the requirement ids.
It writes one failing test per named acceptance check, each carrying `@trace <FR-ID>`.
**Verify the tests fail for the right reason** (behavior absent, not a broken fixture) —
the agent reports the failure reason per test; sanity-check it. If it returns `BLOCKED`,
STOP and escalate. Do not proceed to implementation on a bad RED bar.

### Step 1 — implement to green (pre-loop)

Spawn `capability-implementer` with the spec and the RED tests. It writes product code and
an Alembic migration for every schema change until `scripts/verify.*` and `gate-slice` are
green, **without weakening the RED tests**. It returns `GREEN` or `BLOCKED`.

### Step 2 — the SLICE LOOP (max 3 iterations)

Each iteration runs these stages **in order**. The first stage that produces a blocking
result routes its artifact to `capability-implementer` as rework and **starts the next
iteration** (re-run from the gate — do not review code that does not build).

1. **Gate (deterministic).** Run the gates yourself (do not change their logic):

   ```
   python scripts/gate-slice          # verify.* battery + backend coverage ratchet
   python scripts/check-traceability  # the slice's ids must be COVERED, not GAP
   python scripts/check-trajectory    # git-visible process facts (trailers, evidence)
   ```

   RED -> hand the failing output to the implementer -> next iteration.

2. **Independent review (parallel).** Gate green -> spawn `code-reviewer` **and**
   `security-reviewer` **in parallel** (two Agent calls in one message), each given the
   slice diff (`git diff main...HEAD`) and the spec. Collect their findings. Any
   `[BLOCKING]` from either -> hand **all** blocking findings (with `path:line`) to the
   implementer as rework -> next iteration.

3. **Trajectory-eval (LLM judgment).** No blocking review findings -> spawn `eval-judge`
   with the slice diff and `evals/rubrics/trajectory-quality.md`. This grades what the
   deterministic `check-trajectory` explicitly **cannot** (see its honesty boundary):
   test-first ordering, that **no test was weakened/skipped/deleted to force green**,
   scope discipline, honest reporting. On `pass: false`, **return the judge's diagnosis to
   the implementer as REWORK** (e.g. "test X was weakened — it asserts only status 200
   where the spec names the cookie attributes; rewrite it test-first"). **Do NOT
   auto-rollback and do NOT `git reset`** — a destructive action on an LLM verdict is
   forbidden. Then -> next iteration.

**Exit green:** an iteration in which the gate is green, neither reviewer returns
`[BLOCKING]`, and the trajectory-eval passes -> leave the loop and go to the Judge.

**Cap reached:** if after **3 iterations** the slice is still blocking on any stage,
**STOP and escalate to the owner** with the open findings/diagnosis. Do **not** loop
forever, and do **not** weaken tests or lower a gate to force an exit. The cap is
deliberate: a slice that cannot converge in three honest iterations needs the owner, not
another lap.

### Step 3 — Judge (once, at the end — not inside the loop)

Only after the loop exits green, act as the **Judge** and score the slice against the
**Definition of Done** (AGENTS.md):

1. Meets every acceptance check in `docs/specs/NNN-*.md`.
2. `scripts/verify.*` / `gate-slice` fully green, and `check-traceability` /
   `check-trajectory` clean.
3. An independent Checker ran (the review + trajectory-eval passes above) — maker was not
   checker — and (on the PR) CodeRabbit.
4. Trailers present (`Refs:`/`Slice:`), no secrets committed, `AGENTS.md`/skills updated if
   conventions changed.

Commit the clean review evidence to `docs/qa/reviews/NNN.md` (`Result: pass`) — the
deterministic `check-trajectory` requires this **before** the slice may be marked done.

- **NOT DONE** -> the Judge is not a rework loop: return the specific gap to the
  `capability-implementer` and re-enter Step 2 (this counts against the cap). Only the
  Judge marks a slice done.

### Step 4 — on DONE

- `openspec archive <change>` — moves the change to `changes/archive/` and applies the
  deltas into `openspec/specs/<capability>/spec.md`.
- Update `docs/current-state.md` (Kyiv timestamp): slice NNN done.
- **The owner opens the PR.** Do **not** push in this command; leave the branch for the
  owner to review and open per `AGENTS.md` (PR template + CodeRabbit).

## Summary of the guarantees this command encodes

- **(a) Ratified first.** The owner ratifies the spec/change before `/run-slice`; the loop
  never self-ratifies.
- **(b) Capped, then escalate.** Max 3 iterations; on non-convergence it STOPS and escalates
  to the owner rather than looping forever or weakening tests to force green.
- **(c) Diagnosis, not rollback.** The trajectory-eval returns a diagnosis for the
  implementer to rework; it never rolls back or resets — destructive action on an LLM
  verdict is forbidden.
- **(d) One Judge, at the end.** The Judge runs once after the loop exits green and is the
  only role that marks the slice done.
