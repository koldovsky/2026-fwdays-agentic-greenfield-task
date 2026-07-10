---
name: spec-loop-preflight
description: >-
  Pre-flight for an OpenSpec backlog: validate + plan the whole backlog AND set up the run, before the
  implementation loop. It (1) selects or mints the loop RUN — sync an in-progress run, start a fresh run
  over a drained backlog, or clear and restart — under `loop/runs/<run-id>/` with a `loop/latest` pointer,
  so a new run never clobbers a finished one's evidence; (2) reads EVERY pending change and checks each for
  spec sanity, cross-spec traceability (does every datum/route/contract it consumes have an upstream
  provider — or is it a dangling contract?), quality, and implementability; (3) creates or syncs that run's
  STATE + live task list; and (4) produces a manifest annotating, per spec, the distilled brief, the
  real-journey acceptance, WHERE a security review is needed, and WHICH cross-spec seams need extra tests —
  then STOPS for your review (a go/no-go). Use this WHENEVER the user wants to validate / sanity-check /
  prep specs before building, "preflight the loop", "are these specs ready / implementable", "check the
  backlog", "plan the specs", start a NEW loop run or a fresh/clean run, or right before kicking off
  spec-loop on a multi-spec backlog. It does NOT implement code (that's the spec-loop skill) and does NOT
  design or propose specs (that's /opsx:propose, /opsx:explore) — it validates, plans, and sets up the run,
  then hands a manifest to spec-loop.
license: MIT
metadata:
  author: cardinal
  version: "0.2.0"
  generatedBy: skill-creator
---

# Spec Loop Preflight — validate the backlog, set up the run, before a line of code

This skill is the **preflight half** of the spec-loop. Its companion, `spec-loop`, *implements*; this one
*validates, plans, and sets up the run* — once, up front, across the **whole backlog** — and then **stops so you
can look** (a go/no-go) before the expensive implementation run begins. Preflight → flight.

**Why this is a separate phase, not just the loop's first step.** Every hollow-app failure this loop was built
to prevent lives at a **seam between specs**: a consumer reads a saved value no spec provides, a route is
scaffolded as a placeholder no later spec fills, an integration spec is tested only against its own fixture. You
cannot see a seam from inside one spec — **traceability is inherently a whole-backlog computation**. Doing it as
a deliberate batch pass, with every pending change in view at once, is both cheaper (plan each spec once, reuse
on every retry) and *more correct* (dangling contracts only show up when you trace one spec's assumptions back
into the others). And because it **stops and presents** before implementation, it gives you a real review point
— see the bad spec, kill it or re-propose it — that costs nothing, instead of discovering it 20 specs deep.

The output is a **manifest** (`loop/latest/manifest.md`): per spec, a quality verdict, a distilled brief, the
real-journey acceptance, a **security map** (which specs touch a security surface; which are security-*critical*),
and a **seam-test map** (which cross-spec seams need an extra test). `spec-loop` consumes this manifest and skips
its own planning gate; if you skip preflight and run `spec-loop` directly, it falls back to planning each spec
inline — so preflight is an **enhancement, never a hard prerequisite**.

## Run lifecycle — sync, new, or clear

The loop's artifacts are **namespaced per run** so a new run never clobbers a finished one's evidence (this is
a prior run's manifest + security report are process evidence worth preserving — losing them is a real loss). Each run
is `loop/runs/<run-id>/` (its own `STATE.md`, `manifest.md`, `artifacts/`, `report.md`); a **`loop/latest`
symlink** points at the current run, and every loop path written `loop/latest/…` resolves through it. Preflight
decides which run you're in **deterministically, from state — it does not ask every time**:

- **No `loop/runs/` yet** → **first run**: mint `run-1-<date>`.
- **`loop/latest` is mid-flight** (its STATE has specs not yet `done`/`blocked`) → **sync**: stay in that run.
  Re-validate only *new/changed* specs, refresh its manifest in place, re-sync STATE + the task list. (This is
  idempotent — the same step doubles as the loop's per-pass re-sync engine.)
- **`loop/latest` is fully concluded** (all its specs `done`/`blocked`, end-of-run report present) **and**
  `openspec list` shows new pending changes → **new run**: mint `run-<n>-<date>` and plan the fresh backlog.
- **Explicit clear** (the user asks to start over / discard the plan / "fresh run") → mint a new run **even if
  one is mid-flight**. The old run folder is **left intact** as the record; `loop/latest` just repoints.
  Clearing repoints, it never deletes — namespacing is what makes "clear" a cheap, non-destructive mint.

Mint a run deterministically with the off-model helper (a monotonic counter + the configured date). This is the
one place a run id is spelled, so preflight and the loop never disagree:

```bash
RUN=$(bash .claude/skills/spec-loop/scripts/mint-run.sh)   # e.g. run-2-2026-07-01
# creates loop/runs/$RUN/artifacts and repoints the loop/latest symlink; prints the run id
```

The script owns only the *mechanical* mint; the sync-vs-new-vs-clear **decision** above is yours to make.

`spec-loop` reads `loop/latest` to know which run to build into / resume from; run standalone (no preflight) it
applies this **same** rule itself, so the two skills never disagree about which run is current.

## When to use / not use

Use this to **vet, plan, and set up** a run for a ready backlog before implementing it. **Do not** use it to
*write* specs — proposing/refining is `/opsx:propose` and `/opsx:explore`; preflight *consumes* changes that
already exist and never invents scope (it *flags* a weak or unimplementable spec for a human, it does not rewrite
it). Do not use it to *run* the implementation — that's `spec-loop`. Preflight is read-only over the codebase: it
writes only under the run (`loop/runs/<run-id>/STATE.md`, `loop/runs/<run-id>/manifest.md`), the `loop/latest`
pointer, and the task list. It never touches source, specs, or project config.

## The procedure

You (the session running this skill) are the **orchestrator**. Keep your own context thin — the heavy per-spec
reasoning is delegated to `spec-loop-planner` subagents (read-only, `opus`). You assemble the cross-spec view and
the manifest.

1. **Assess.** Run the shared Step-0 snapshot so you know the backlog, project shape, and the current run:
   `bash .claude/skills/spec-loop/scripts/loop-status.sh`. If there are **no pending changes**, stop and tell the
   user to propose one (`/opsx:propose`) — there is nothing to validate.

2. **Select or mint the run.** Apply the run-lifecycle rule above: **sync** into `loop/latest` if it is mid-flight;
   otherwise **mint** a fresh `loop/runs/<run-id>/` and point `loop/latest` at it (mint a new one, leaving the old
   intact, on an explicit **clear**). Everything below writes under `loop/latest/`.

3. **Create or sync STATE + the task list.** Use `.claude/skills/spec-loop/references/state-format.md`. Write one
   row per pending change into `loop/latest/STATE.md` and create one **task** per spec (live visibility — the
   up-front list the user wants to see). This step is **idempotent**: re-running preflight reconciles
   added/changed/removed specs, which is exactly the **sync** case above. Timestamp every row with
   `bash .claude/skills/spec-loop/scripts/loop-now.sh`.

4. **Build the cross-spec dependency map.** Read each change's `proposal.md` and `specs/<capability>/spec.md`
   deltas (they state what capability is added/modified) plus the **archived** specs (already-provided
   capabilities). Assemble a compact table — `spec → provides → consumes → routes/screens` — across the whole
   backlog. This is the artifact that makes traceability possible; keep it tight, it seeds every planner.

5. **Plan every spec (batch).** Spawn one **`spec-loop-planner`** per pending change — they are read-only, so run
   them **concurrently** (multiple `Agent` calls in one message). Pass each the change name, the **dependency
   map**, and the request to run the full Gate-0 analysis and return its manifest entry (procedure in
   `.claude/skills/spec-loop/references/gates.md` → "Gate 0", role in `.claude/agents/spec-loop-planner.md`). Each
   returns: a **quality verdict**, the **distilled brief**, the **plan**, the **real-journey acceptance**, the
   **security-surface** + **security-critical** flags, the **extra-test obligations** (the seams that need a
   crossing test), the **traceability** result (dependencies resolved, or dangling contracts), and risks.

6. **Aggregate the manifest.** Write `loop/latest/manifest.md` (schema in `references/manifest-format.md`): the
   dependency map, a one-line-per-spec verdict summary, and each planner's full entry. Mirror each verdict to
   STATE's `plan` row and the spec's task.

7. **Stop and present for review.** This is the deliberate checkpoint — do **not** auto-start the implementation
   loop. Summarize for the user (concise, scannable):
   - **Verdict per spec:** SOUND, or the specific gap and the seam the loop will try to close.
   - **Blockers needing a human:** any spec that is genuinely **unimplementable** as written, or whose missing
     scope is real design work (→ `/opsx:propose` / `/opsx:explore`), or whose dangling contract no pending spec
     can supply. These are the things to fix *before* burning implementation tokens.
   - **The security map:** which specs touch a security surface (→ the end-of-run deep review covers them), and
     which are **security-critical** (→ also get a deep review at their own gate).
   - **The seam-test map:** the cross-spec seams the verifier must cover with an extra test.
   - Then: "Run `<run-id>` set up; manifest at `loop/latest/manifest.md`, STATE seeded. Run **spec-loop** when
     you're ready and it will consume this." Hand off; let the user decide to proceed.

## What preflight decides (so the loop doesn't have to)

The manifest front-loads exactly the judgments that have no safety net once implementation starts:

- **Is this spec sound and implementable?** A spec the loop builds "to the letter, nothing more" must, on its
  face, yield a *working* user capability — not a placeholder, fixture, or demo blessed as the acceptance surface.
- **Does every assumption trace back?** Each consumed datum/route/contract must have a providing spec (archived or
  pending). A consumed-but-unprovided dependency is a **dangling contract** — flag it; if a pending spec could
  supply it, note the ordering; if none can, it's a human's job to propose one.
- **Where does security matter?** Most security review is wasted on transitional mid-loop states. Preflight names
  the surfaces so the **deep** review runs once at the end over the *finished* system (and per-spec only for a
  security-*critical* spec). The per-spec reviewer keeps a cheap baseline tripwire regardless. (Three tiers — see
  `spec-loop`'s gates.)
- **Where do tests need to cross a seam?** For every cross-spec seam in the dependency map (spec A writes X → spec
  B reads X), preflight records a **test obligation**: the verifier must author a test that exercises that
  crossing, not each side against a mock. This is the direct antidote to "every spec passed in isolation, the app
  is hollow."

## Autonomy & interrupts

Preflight is **autonomous and diagnostic** — it does not pause mid-analysis. It surfaces findings at the **one**
natural checkpoint: the review at step 7. The only reasons to stop earlier are the genuine dead-ends: an empty
backlog (nothing to do), or a question with no safe default (ambiguous intent, an irreversible action). Selecting
the run (sync vs new vs clear) is decided from state, not asked — the exception is when the user explicitly asks
to clear/restart. Designing a spec's genuinely-missing scope is always a `/opsx:propose` job — preflight flags it;
it never invents it.

## Reference files

- `references/manifest-format.md` — the `loop/latest/manifest.md` schema the loop consumes.
- `.claude/skills/spec-loop/references/gates.md` — the **Gate 0** procedure the planners run.
- `.claude/skills/spec-loop/references/state-format.md` — the STATE template, the per-run layout, and the
  task-list mirror (shared).
- `.claude/agents/spec-loop-planner.md` — the planner role (read-only, `opus`/`xhigh`) preflight spawns per spec.
