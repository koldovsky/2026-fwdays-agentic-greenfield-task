---
name: spec-loop
description: >-
  Autonomous, multi-spec implementation loop for any repo with an OpenSpec backlog: drives EVERY
  pending change through gates — (1) implement, (2) deterministic checks (off-model) + real-stack
  user journeys + an architecture/correctness review with a per-spec security tripwire, (3) docs —
  then a single deep end-of-run security review over the finished, integrated system. It consumes the
  validated plan spec-loop-preflight produced (the manifest), or falls back to planning each spec inline
  (Gate 0 — spec sanity & cross-spec traceability). Uses a maker≠checker subagent split, a
  consistently-timestamped STATE file mirrored to the live task list, a checkpoint commit before
  writing, per-spec commits, retry→triage on failure, and loops until the backlog is drained AND the
  real journeys pass. Use this WHENEVER the user wants to implement or finish MULTIPLE specs or the
  whole backlog autonomously: "run/keep running the loop", "implement all the (OpenSpec) changes",
  "keep going until everything's done/archived", "work the backlog unattended", "gate loop", "spec
  loop", "loop engineering", a maker-checker implementation loop, or resuming an interrupted run from
  STATE. To only VALIDATE / plan specs before building, or to set up / clear a run, use
  spec-loop-preflight. NOT for one-off,
  single-change actions other skills own: proposing or exploring a change (/opsx:propose,
  /opsx:explore), archiving one finished change (/opsx:archive), implementing/testing/reviewing a
  single isolated change or file, or cron-style scheduling (/loop, /schedule).
license: MIT
metadata:
  author: cardinal
  version: '0.6.0'
  generatedBy: skill-creator
---

# Spec Loop — autonomous implementation loop that verifies the app actually works

This skill turns "implement the specs" into a **self-governing loop** instead of you hand-prompting each
step. It is a direct application of loop engineering (Addy Osmani / Boris Cherny): _your job is to write the
loop, not to hold the agent's hand through every turn._ The loop finds the next spec, checks the spec is
sound, hands it to subagents, proves the result really works, writes down what happened, and decides what's
next — and you stay the engineer by reviewing the STATE file, the artifacts, and the final diff.

Five ideas are load-bearing; keep them in mind, they explain every rule below:

- **State is the spine.** "The agent forgets, the repo doesn't." All progress lives on disk in
  `loop/latest/STATE.md` (the current run's durable, resume-safe spine), **mirrored to the live task list** so
  you can watch it.
- **Maker ≠ checker.** The agent that verifies a spec is always a _different_ subagent (and model) than the
  one that implemented it.
- **Verification means the real thing works.** A spec is not "done" because code was written and unit tests
  pass — it is done when a **real user journey, driven against the real stack, proves it**, with evidence on
  disk. Green tests over mocks are not proof.
- **The seams between specs are where it breaks.** Each spec built and checked in isolation lets the
  glue _between_ them — wiring, data flow, a route nobody filled — ship hollow. The loop guards the seams on
  three fronts: cross-spec **traceability** before building (`spec-loop-preflight`'s manifest, or an inline Gate 0),
  a **crossing test** for every seam (a verifier obligation), and real cross-seam **journeys** after (Gate 2).
- **Surface only what the loop can't handle.** A spec that fails past the retry budget is marked BLOCKED and
  triaged; the loop runs on. It interrupts you only at a genuine dead-end, not for routine decisions.

## When to use / not use

Use this when there is a backlog of OpenSpec changes to implement and the user wants them driven to
completion with real verification evidence. **Do not** use it to _design_ specs — proposing/refining specs is
`/opsx:propose` and `/opsx:explore`. This skill _consumes_ ready changes; it never invents scope (Gate 0
_flags_ a weak spec and raises its journey bar, but does not rewrite it).

Prerequisites the assessment step checks for you: a git repo, an installed toolchain, and at least one
pending OpenSpec change. **If the project isn't bootstrapped yet** (no source tree / dependencies for a code
project), this loop _implements_ features — it does not bootstrap; tell the user to bootstrap the project
first (however that project does it).

## The orchestrator stays thin

You (the session running this skill) are the **orchestrator**. Your context holds only: the control flow, the
current spec, and the STATE file. All heavy lifting — reading specs, writing code, running checks, driving
journeys, writing docs — is delegated to fresh **subagents**, and deterministic checks run with **no model**
at all (the project's hooks, or a plain script). A loop that may run for hours must not let one giant context
rot. Spawn a subagent per gate, let it return a compact result, record it to STATE + the task list, move on.

**Spawn each gate by its registered agent type — never the default `general-purpose`.** Every role is a
custom agent under `.claude/agents/spec-loop-*.md`; pass its name as the `Agent` tool's **`subagent_type`**
(`spec-loop-planner`, `spec-loop-implementer`, `spec-loop-verifier`, `spec-loop-reviewer`,
`spec-loop-security`, `spec-loop-documenter`, `spec-loop-stop-judge`). Each file bakes in that role's **model**
and **tool scope**,
so passing the name is what makes maker≠checker real (the planner & verifier think with the right models,
**not** the chat model). Pass only the dynamic context (spec, brief, plan, journey, findings, attempt) as the
`prompt`. See `references/subagents.md` for the role→`subagent_type`→model mapping.

## Step 0 — Initial assessment (always first)

Never start implementing blind. Run the assessment helper and act on what it tells you:

```bash
bash .claude/skills/spec-loop/scripts/loop-status.sh
```

It reports git cleanliness, the OpenSpec backlog (`openspec list --json`), the project **binding**
(`loop.config.sh`: whether `loop_verify` and the journey contract are declared), the **current run**
(`loop/latest` → `loop/runs/<run-id>/`) and whether its `STATE.md` and a `spec-loop-preflight` manifest
(`loop/latest/manifest.md`) exist, and **whether the project's deterministic-check automation is present**
(hooks / pre-commit / CI — the thing the loop reuses). Act in this order:

1. **Resolve the run.** Read `loop/latest` — the current run's pointer (`loop/runs/<run-id>/`).
   `spec-loop-preflight` normally mints it; if it's **absent** (you're running the loop standalone), mint one
   now with the off-model helper: `bash .claude/skills/spec-loop/scripts/mint-run.sh --if-absent` (prints the
   current run id if one already exists, else mints a fresh `run-<n>-<date>/` and points `loop/latest` at it).
   Whether to **sync** into an in-flight run or start a fresh one is the judgment *above* that mechanical mint —
   full rule: `spec-loop-preflight` → "Run lifecycle — sync, new, or clear". Every path below is under
   `loop/latest/`.
2. **Decide the backlog, sync it to STATE + the task list.** The unit of work is an active OpenSpec change.
   **If there are no pending changes, stop and ask** the user to propose one (`/opsx:propose`). Otherwise
   write each pending spec to `loop/latest/STATE.md` and create a matching **task** (live visibility). Re-do
   this sync at the top of every pass — specs may be added/changed/removed mid-run.
3. **Consume the preflight manifest, or plan inline.** If `loop/latest/manifest.md` exists,
   `spec-loop-preflight` already validated and planned the backlog — Gate 0 is **done**. Read it; each spec's
   section _is_ the planner output (brief + plan + journey acceptance + security/seam flags), so skip
   re-planning and start such specs at Gate 1. For any pending spec the manifest doesn't cover (e.g. one added
   after preflight ran), plan it **inline** with `spec-loop-planner` — the same Gate 0, just not batched. **No
   manifest at all?** That's fine — you run the inline fallback for every spec. Consider suggesting the user run
   `spec-loop-preflight` first for the up-front review, but never require it.
4. **Resume or initialize STATE.** If `loop/latest/STATE.md` exists, read it and continue (the resolution
   column says which specs are done/blocked/in-flight). Else create it from `references/state-format.md`. Ensure
   `loop/` is excluded from the project's format check (its Markdown artifacts — across every run — aren't
   source), however that project ignores files, so the check doesn't trip on the loop's own files.
5. **Checkpoint before writing.** If the working branch is the default (e.g. `main`), create a feature branch
   (`git switch -c spec-loop/<YYYY-MM-DD>`). **Commit any pre-existing working-tree changes** so they're
   preserved and each spec starts from a clean, revertable baseline. Never start writing onto uncommitted
   work you'd clobber.
6. **Establish a baseline.** Run the deterministic suite once on the current tree so you can tell _your_
   breakage from pre-existing breakage:
   `bash .claude/skills/spec-loop/scripts/verify-gate.sh loop/latest/artifacts/_baseline`. If it's already red,
   **stop and ask** whether to fix it first.
7. **Preflight verification capability.** Deterministic checks: the project declares its own gate as
   `loop_verify` in `loop.config.sh`, and the loop **reuses** it — via the project's hooks/CI as the
   implementer edits, and once at Gate 2 for the record (`verify-gate.sh`). The loop **never installs or
   rewrites the project's check config**. Journeys: when the project declares a journey/service contract
   (the `loop_*` functions in `loop.config.sh`), the **journey gate is the core check**, so confirm that
   contract is present and runnable; if a UI project is missing it, **surface it now** (offer to declare the
   contract) — don't discover it mid-Gate-2. A non-UI/library project declares no journey contract and
   relies on the deterministic gate plus honest unit/integration tests.
8. **Ask only when genuinely blocked.** Beyond the empty-backlog, red-baseline, and missing-verification
   cases above, stop and ask only for a true dead-end: a dirty tree that would collide, a goal so ambiguous
   there's no safe default, or an irreversible action. Otherwise proceed — "build it like someone who intends
   to stay the engineer," not someone who needs permission for every step.

## The loop (control flow)

This is the exact flow. Treat it as the spec for your own behavior. `BUDGET = 3` attempts per spec.

```
assess(); resolve_run(); sync_backlog_to_STATE_and_tasks()   # Step 0; loop/latest = current run; ask only if blocked
manifest = read("loop/latest/manifest.md") if present   # spec-loop-preflight's validated plan (Gate 0 done); else None → plan inline
checkpoint_commit()                                 # branch if on default; commit pre-existing WIP before any write
flagged_surfaces = []                               # accumulate security surfaces for ONE end-of-run deep review
while the backlog has a pending, non-blocked spec S:
    sync_backlog_to_STATE_and_tasks()               # re-scan each pass: specs may be added/changed/removed
    plan = manifest[S] or Planner(S)                # GATE 0: consume the manifest; plan INLINE (opus) only for a spec it doesn't cover
    STATE.log(S, "gate0", ...); task.start(S)       # gaps (dangling contracts, under-scope) → STATE triage; raise the journey bar, don't stop
    if plan.security_surface: flagged_surfaces += (S, plan.surfaces)   # deep security DEFERS to the end-of-run pass
    attempt = STATE.attempt(S) or 1
    fixes = none
    loop:
        Gate1_Implement(S, plan.brief, plan, plan.journey, fixes)   # spec-loop-implementer (sonnet, MAKER); deterministic hooks run as it edits
        STATE.log(S, "gate1", ...)
        static = verify_gate_sh(S)                  # NO MODEL — project hooks / plain script; red hard-check ⇒ FAIL
        # Gate 2's model agents over the diff — TWO always; +deep security ONLY for a security-CRITICAL spec (spawn concurrently):
        r2 = combine(static,
            Verify(S, plan.journey, plan.seam_tests),   #   spec-loop-verifier (sonnet/max, ≠maker) — honest test + SEAM tests + REAL-STACK journeys → findings.md
            Review(S),                                  #   spec-loop-reviewer (opus/high; SKIP if trivial) — arch+correctness + security TRIPWIRE + surface flag → review.md
            plan.security_critical ? Security(S, modeB) : —)  #   spec-loop-security (opus/high) — deep review HERE only if the spec DEFINES a security boundary → gate2/security.md
        STATE.log(S, "gate2", r2)
        if r2.failed:
            attempt += 1
            if attempt > BUDGET: STATE.block(S, r2.findings); break  # → triage, next spec
            fixes = r2.findings; continue           # back to Gate 1 with the failures as fix instructions
        r3 = Gate3_Docs(S)                          # spec-loop-documenter (haiku) — sync specs + update docs
        STATE.log(S, "gate3", r3)
        if r3.failed:
            if r3.docs_only: fixes = r3.findings; rerun Gate 3 only; continue   # docs-only ⇒ Gate 3 only, NOT a re-implement
            attempt += 1
            if attempt > BUDGET: STATE.block(S, r3.findings); break
            fixes = r3.findings; continue           # code/doc mismatch needing code ⇒ Gate 1
        archive(S); commit(S)                       # only when ALL gates green; one spec, one commit; no push
        STATE.resolve(S, "done"); task.complete(S); break
# End-of-run — backlog drained; verify the FINISHED, integrated system (maker≠checker even here):
judge = StopConditionJudge()                         # confirm: drained + green + JOURNEYS PASS + NO ORPHANED SEAMS
sec   = flagged_surfaces ? Security(final, flagged_surfaces, modeA) : PASS  # ONE deep security pass over the integrated system → loop/latest/artifacts/_final/security.md
done  = judge.DONE and sec.PASS                      # victory needs BOTH; a high-sev finding blocks "done" → triage + report
report()                                            # done specs; BLOCKED/triage; orphaned seams; security findings; next steps
offerConsolidatedDemoVideo()                        # opt-in only; no per-spec video
```

Key rules embedded above:

- **Write STATE before and after every gate** (timestamp from `scripts/loop-now.sh` — the project's
  configured timezone, else UTC) and **mirror it to the task list**. A half-written entry tells the next
  run exactly where to resume.
- **A Gate-2 failure restarts at Gate 1** with the findings as fix context. A **docs-only Gate-3 failure
  re-runs Gate 3 only** — don't re-implement for a doc fix.
- **Archive only when all gates pass** in one attempt, then **commit that spec** (one spec, one commit).
- **Budget exhausted → BLOCKED + triage, then continue.** Never loop forever on one spec; never lower the bar
  (suppress a check, seed a fixture, stub a path) to make a gate pass.

### Termination

The loop ends when no pending, non-blocked spec remains. Before declaring victory, run **two end-of-run checks
in parallel** (maker≠checker even here). The **StopConditionJudge** confirms **all four** — backlog drained,
deterministic suite green, **real-stack journeys pass**, and **no orphaned seams** (no scaffolded
route/placeholder with no owning spec; no consumed capability lacking a provider). And over the **finished,
integrated system**, the dedicated **`spec-loop-security`** agent runs a single **deep security review** across
every surface flagged during the run — this is where a cross-seam credential leak actually shows up, and where
it's cheapest to catch: once, on the real thing, not on every transitional mid-loop diff. **Victory needs
both**: all four checks green AND no high-severity security finding. Anything short goes to triage and the
final report — a human review point, not a mid-run interrupt. Then **stop and ask the user to propose the next
change** — this loop never auto-invents specs.

Finally, **offer a consolidated demo video** — one end-to-end recording across the run's flows (replay the
journeys with video on). Offer it; don't record unprompted — it's evidence, not verification, and never runs
per-spec.

## The gates

Summarized here; exact commands, the journey runner, and pass/fail criteria are in `references/gates.md` and
`references/journeys.md` — read them before running Gate 0 and Gate 2 the first time.

- **Gate 0 — the plan (owned by `spec-loop-preflight`).** Not the loop's to define: **`spec-loop-preflight`**
  validates + plans the whole backlog up front → `loop/latest/manifest.md`, and the loop **consumes** each spec's
  entry (the **distilled brief**, plan, **real-journey acceptance**, **security map**, and **seam-test
  obligations**) and starts at Gate 1. For a spec the manifest doesn't cover, the loop spawns the **same
  `spec-loop-planner` inline**. The procedure lives in the planner agent; the _why_ in `spec-loop-preflight`
  (see `references/gates.md` → "Gate 0"). Autonomous — raises the bar, doesn't stop.
- **Gate 1 — Implement (maker, `sonnet`).** Implement each task to the spec, wiring it **for real** (no
  placeholder/stub/demo-data/swallowed-error on a primary path), closing any seam the planner flagged. The
  implementer does **not** run its own checks — the project's deterministic-check hooks fire on every edit
  and surface failures immediately; it reuses them and fixes the root cause, never suppressing a check.
- **Gate 2 — Verify (checker, ≠ maker).** Deterministic gate (no model — the project's `loop_verify`, run by
  its hooks/CI or the plain `verify-gate.sh` script). Then **two** model agents over the diff: the
  **verifier** (`sonnet`/`max`) authors an honest hollow-failing test, satisfies the **seam-test
  obligations**, and runs the **real-stack user journeys** (real services, real storage, prod build, **no
  fixture seed**, **no video**); the **reviewer** (`opus`/`high`; skipped on a trivial diff)
  reviews architecture + correctness + a **security tripwire** that **flags the surface** for the end-of-run
  pass. A **third** agent joins **only for a security-_critical_ spec** (one that _defines_ a boundary): the
  dedicated **`spec-loop-security`** (`opus`/`high`) reviews it deeply here rather than waiting. Any red check,
  failing journey, high-sev finding, architectural misfit, or primary-path correctness defect fails → Gate 1.
- **Gate 3 — Docs (`haiku`).** Sync spec deltas + update user-facing docs to the _implemented_ behavior. A
  docs-only failure re-runs Gate 3 only.
- **End-of-run — deep security (`spec-loop-security`, `opus`).** After the backlog drains, one deep security
  review over the **finished, integrated system** across every flagged surface (alongside the StopConditionJudge).
  A high-severity finding blocks the "done" declaration → triage + report. This is the primary home for deep
  security — most surfaces are transitional mid-run, and a cross-seam leak only shows up in the assembled whole.

## Non-negotiable guardrails

Conventions written down once so the loop doesn't re-derive — or quietly violate — them.

- **No hollow features.** A primary path backed by a **placeholder/stub/no-op**, by **demo/fixture/seed data
  standing in for the real source**, or with a **swallowed error** (empty `.catch()`, no surfaced error
  state) is **not done** — Gate 2 fails it. "It's just for demo" is a gate failure, not an excuse. A spec may
  defer edge cases, never scope out its own core behavior.
- **Verify against reality.** The acceptance proof must exercise the real round-trip; **don't mock the
  dependency the spec exists to integrate**, and **don't seed a fixture** to make a journey pass. "Done" = the
  real journey passes, not `tasks.md` `[x]`.
- **Checks are FIXED, never suppressed.** A red check sends the spec back to Gate 1 to fix the root
  cause — no inline suppression pragma, disabled rule, skipped/ignored test, or weakened config (whatever
  form those take in the project's toolchain). If a rule is genuinely wrong, that's a human decision → triage.
- **Checkpoint before writing.** Branch off the default before the first write, and commit pre-existing WIP,
  so each spec is a clean, revertable diff.
- **Stay in scope.** Implement only what the change specifies (plus the connective tissue to make its declared
  journey actually work). Genuinely new scope → a future proposal in STATE triage, never silent expansion.
- **Honor the project's load-bearing invariants** (from its `CLAUDE.md` / `AGENTS.md`). A change that would
  violate one is a design problem → triage, don't paper over it.
- **Reuse existing skills, don't reinvent.** `openspec-apply-change` for implementation mechanics,
  `openspec-sync-specs` for syncing, `openspec-archive-change` for archiving, the project's review skills
  (a dedicated security-review skill for the end-of-run — and security-critical — deep security pass, a
  code-review skill for the reviewer's correctness lens), and the project's declared journey runner
  (`loop_journeys`). The loop orchestrates these; it doesn't rewrite them.
- **The skill never writes project config.** The deterministic checks are the project's, defined once in
  `loop.config.sh` / its hooks; the loop _reuses_ `loop_verify` and _reads_ the journey/service contract —
  it does not install, edit, or duplicate the project's checks or hooks. A missing piece is surfaced at
  Step 0, not silently created.
- **Spawn each gate by its `subagent_type`, so the right model AND effort come for free.** Each role's
  `model`, `effort`, and tool scope are baked into `.claude/agents/spec-loop-*.md` (planner `opus`/`xhigh`;
  verifier `sonnet`/`max`; reviewer `opus`/`high`; security `opus`/`high` (end-of-run over the finished system,
  plus opt-in per-spec for a security-critical spec); implementer `sonnet`/`max`; stop-judge `sonnet`/`medium`;
  documenter `haiku`/`low`). Pass the name and both follow — don't default to `general-purpose`. Pass the
  `Agent` `model` option only to _override_ the model (e.g. implementer→`opus` for a hard spec; the reviewer
  is already `opus`, skipped on a trivial diff); to change a role's **effort**, edit its agent file (the
  `Agent` tool call has no `effort` param).
- **Commit each spec after it passes all gates** as ONE commit:
  `feat(<capability>): <spec> — via spec-loop (gate0+code+journey+review+docs)`. **Do not push** unless asked.
- **Keep every artifact under the current run in the project's `loop/` tree at the repo root** (`loop/latest/…`,
  a symlink to `loop/runs/<run-id>/`) — never a scratch, temp, or home dir.

## Artifacts layout (process evidence)

**All loop output lives in ONE clean tree at the project root: `./loop/`, namespaced per run.** STATE and every
gate's evidence go under the **current run** and nowhere else. `loop/latest` is a symlink to it; every
`loop/latest/…` path below resolves through that symlink.

```
loop/
├── latest -> runs/<run-id>/            # symlink to the CURRENT run — every `loop/latest/…` path resolves through it
└── runs/
    ├── run-1-2026-06-30/               # a prior, concluded run — kept intact (its manifest + security report are evidence)
    └── run-2-2026-07-01/               # the current run (loop/latest points here)
        ├── STATE.md                    # this run's spine — see references/state-format.md (mirrored to the task list)
        ├── manifest.md                 # spec-loop-preflight's validated plan the loop consumes (see spec-loop-preflight)
        ├── report.md                   # end-of-run summary: done specs, triage, orphaned seams, security findings
        └── artifacts/
            ├── _baseline/              # Step-0 baseline verify logs
            ├── _final/                 # end-of-run: stop-judge verify logs + security.md (deep review of the finished system)
            ├── _demo/                  # optional consolidated end-of-run demo video (only if requested)
            └── <spec-name>/
                └── attempt-<n>/
                    ├── plan/           # planner output: verdict + brief + plan + journey + security map + seam obligations
                    ├── gate1/          # implementer notes, diff summary
                    ├── gate2/          # verify.log (the loop_verify record), findings.md, review.md, security.md (security-CRITICAL spec only)
                    │   └── journeys/   # real-stack journey results, trace on failure (NO video)
                    └── gate3/          # docs diff, sync notes
```

A new run over a drained backlog gets a fresh `runs/run-<n>-<date>/`; prior runs stay put (namespaced), so
their manifest + security report survive as process evidence — `loop/latest` just repoints. `loop/` is committed
as process evidence but excluded from the project's format check (Step 0 ensures the project's ignore list
covers `loop/`, across every run).

## Reference files

- The sibling **`spec-loop-preflight`** skill owns Gate 0 (batch spec-validation + traceability), the run
  lifecycle (sync / new / clear), and produces `loop/latest/manifest.md`; its `references/manifest-format.md`
  documents the schema this loop consumes.
- `references/state-format.md` — the `STATE.md` template, columns, and how to resume; the task-list mirror.
- `references/gates.md` — per-gate procedures: exact commands, the journey runner, pass/fail criteria.
- `references/journeys.md` — the **project contract** (declare real journeys + service startup + review
  skills) and the rules a real-stack journey must satisfy.
- `references/subagents.md` — the role→`subagent_type`→model mapping and _why_ the maker≠checker split is
  enforced.

## The project binding

- `loop.config.sh` (repo root, **project-provided** — the ONLY stack-specific file) declares this project's
  gate and journey contract, and the scripts source it. It is the loop's single interface to the project:
  swap it and the same loop drives a different stack. See `references/journeys.md` for the contract.
  - `LOOP_TZ` — timestamp timezone for STATE (optional; default UTC).
  - `loop_verify` — the project's full deterministic gate, the **same** command its hooks/CI run (reused,
    never redefined by the loop).
  - `loop_services_up` / `loop_services_down` / `loop_preview` / `loop_journeys` — the optional real-stack
    journey contract; a non-UI/library project omits them.

## Scripts

- `scripts/loop-now.sh` — the one canonical timestamp (the project's `LOOP_TZ`, else UTC); every STATE entry
  uses it, so rows are comparable regardless of which agent/machine wrote them.
- `scripts/mint-run.sh [--if-absent]` — the deterministic run mint (no model): a monotonic counter + the
  date → `loop/runs/<run-id>/artifacts` + the `loop/latest` symlink; prints the run id. `--if-absent`
  resolves an existing run instead of minting. The single place a run id is spelled — both skills call it.
- `scripts/verify-gate.sh <dir>` — sources `loop.config.sh` and runs the project's `loop_verify` once for
  the Gate-2 record (tees `verify.log`, non-zero on failure). A **plain script, no model** — the loop reuses
  the project's own gate; it names no runner or package manager. (`LOOP_CONFIG` overrides the binding path.)
- `scripts/loop-status.sh` — the Step-0 snapshot: git state, backlog, the project **binding**
  (`loop.config.sh`: `loop_verify` + journey contract), the **deterministic-check automation** preflight
  (hooks/CI the loop reuses), the **current run** (`loop/latest`) + its STATE/manifest presence.
