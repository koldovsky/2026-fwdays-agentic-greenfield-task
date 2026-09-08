---
description: Automatically author, grill, fidelity-check and ratify one slice's spec from the ratified docs, then hand off to /run-slice — the hands-off spec loop before the code loop
argument-hint: <NNN | capability-name> [id set, if not obvious from the roadmap]
---

# /author-slice — the spec loop orchestrator (autopilot before /run-slice)

Author the spec for the slice named by `$ARGUMENTS` **from the ratified source-of-truth docs
alone**, drive it through an adversarial spec loop until it is ratifiable, auto-ratify it, and
hand off to `/run-slice`. **You are the orchestrator.** You invoke each sub-agent as a **fresh,
isolated-context** sub-agent and you drive control flow. This is the maker≠checker≠judge loop
applied to *specs*: the human wrote the docs (brief, requirements, architecture, DESIGN) and
does **not** read the spec — this loop replaces the human ratification gate with an automated
one, and escalates to the owner **only** when it cannot converge.

Read `AGENTS.md`, `openspec/README.md` (per-slice flow + specs↔OpenSpec bridge), and the
[`/run-slice`](run-slice.md) command (this hands off to it) before you begin.

## Invariants (hold these the entire run)

- **The orchestrator drives; agents return verdicts up.** Sub-agents never call one another.
  Each returns a draft, findings, or a verdict; **you** decide the next step.
- **Every step is a fresh sub-agent.** The handoff is the **artifact** — the draft, the griller
  findings, the fidelity drift diagnosis — never shared memory. Paste the artifact into the next
  agent's prompt.
- **Checkers never write.** Only `spec-author` (the maker) writes files. The griller, the
  fidelity-eval, and you (as judge) never edit the spec — findings route to the author as rework.
- **No destructive action on an LLM verdict.** You never delete or `git reset` the draft because
  the griller or fidelity-eval said FAIL. Findings route to the author as rework; the draft
  **evolves in place** and the trail is this run's **terse trace + the per-stage findings
  artifacts** (not git history — there is only one commit, at ratify). The author commits nothing
  until Step 2.
- **The docs are the ceiling; the author never invents to satisfy a checker.** If the griller
  demands the spec resolve an ambiguity (pin an order, a value, a behavior) and
  `requirements.md`/`architecture.md`/`DESIGN.md` give **no basis** to resolve it, that is a
  **doc gap** — the author returns `BLOCKED` and you escalate, rather than inventing a value
  (which the fidelity-eval would then correctly flag as drift). This is the one rule that makes
  the two checkers non-contradictory: griller-ambiguity is closed **only** from the docs, never
  from thin air.

## Cost discipline

Same bar, no repeated work (mirror `/run-slice`'s cost discipline): lean preflight (read the
handed ids' text + the cited architecture/DESIGN sections + the consumed slices' real shape —
not the whole corpus); pass each sub-agent a **distilled context packet**, not "go read
everything"; run gates with output to a log file and read the tail; keep the trace terse with a
`Cost:` line per stage.

## Roster (all fresh isolated sub-agents)

| Step | Agent | Role | Access |
| --- | --- | --- | --- |
| author / rework | `spec-author` | writes the OpenSpec change + anchor from the docs | read/write (spec & docs only) |
| grill | `spec-griller` | adversarial robustness review (grilling stance, non-interactive) | read-only |
| fidelity | `eval-judge` + `evals/rubrics/spec-fidelity.md` | direction: does the spec match the docs' intent? | read-only |
| judge | you (orchestrator, once at the end) | ratifiable? | — |

## Preconditions (STOP if unmet)

1. **The id set is known and unbuilt.** The slice's requirement ids exist in
   `docs/requirements.md`, are not already owned by a shipped slice, and their upstream seams
   (capabilities this slice consumes) are **already built** in the repo — if a consumed seam is
   not built yet, STOP (order the roadmap so producers precede consumers).
2. **Clean isolated worktree on a dedicated branch** (`feat/NNN-...`), branched off the previous
   slice's tip so the author can read the real shipped code of what this slice consumes. No
   commits to `main`. Run `npm ci` at the repo root first so `npx openspec validate` resolves
   the pinned CLI locally (a fresh worktree has no `node_modules`; without this the gate's
   `npx` either hits the network or fails).
3. **The docs are ratified.** `product-brief.md` / `requirements.md` / `architecture.md` /
   `DESIGN.md` are the owner-approved inputs; this loop does not edit them (a doc gap escalates).

## Step 0 — author the draft (pre-loop)

Spawn `spec-author` with the handed id set + a context packet (the ids' text, the cited
architecture/DESIGN sections, the file list of the real shipped seams to quote). It writes the
OpenSpec change + anchor and self-checks with `openspec validate --strict` + `check-specs`.
Returns `DRAFT READY` or `BLOCKED` (doc gap → escalate to the owner, do not invent).

## Step 1 — the SPEC LOOP (max 3 iterations)

Each iteration runs these stages in order; the first stage that produces a blocking result
routes its artifact to `spec-author` as rework and **starts the next iteration** (re-run from the
gate — do not grill a draft that does not validate). **A `BLOCKED` return from `spec-author` at
*any* iteration** (it hit a doc gap while reworking) → **STOP and escalate to the owner**, exactly
as at Step 0; do not spend the rest of the cap on a hole only the docs can fill.

1. **Deterministic gate.** Run yourself (do not change their logic):
   ```
   npx openspec validate <change> --strict   # valid contract, four-# scenarios
   python scripts/check-specs                 # single-owner ids, known ids, open questions
   ```
   Plus the **handed-id coverage check**: every id in the slice's handed set appears as a
   `### Requirement:` naming it **with ≥1 `#### Scenario:`** (grep the ids in the change's
   `spec.md`; `openspec validate` only checks that *present* requirements have a scenario, so a
   silently-dropped id is invisible to it — catch it here, deterministically). **Note:**
   `check-specs` only *enforces* closed open questions on a `ratified` anchor (draft ⇒ WARN);
   during the loop the anchor is `draft`, so **treat a `check-specs` open-question WARN as a
   blocking gate result here** (do not wait for the ratified re-run in Step 2 to discover it).
   Any RED / uncovered id / open-question WARN → hand the output to the author → next iteration.

2. **Independent checkers (parallel).** Gate green → spawn `spec-griller` **and** `eval-judge`
   (with `evals/rubrics/spec-fidelity.md`) **in parallel** (two Agent calls in one message), each
   given the drafted change + anchor + the cited docs + the consumed slices' real code. Collect
   both. **Any `[BLOCKING]` from the griller, or `pass:false` from the fidelity-eval** → route as
   rework → next iteration. Their lenses are distinct: the griller = *robustness* (holes an
   implementer could mis-build); the fidelity-eval = *direction* (drift from the docs' intent).
   - **Contradiction / doc-gap short-circuit (do not burn the cap on it).** Before routing a
     griller ambiguity finding to the author, check whether the docs actually contain a basis to
     resolve it. If the griller demands a specificity (an order, a value, a behavior) that
     `requirements.md`/`architecture.md`/`DESIGN.md` **do not provide**, do **not** route it as a
     normal fix — that is a **doc gap**: routing it would make the author either invent (→ fidelity
     drift next iteration → oscillation) or return `BLOCKED`. **Escalate it to the owner now** as
     "the griller needs X specified; the docs don't; add it to `requirements.md`/`architecture.md`."
     Only route griller findings the author can close **from the docs**.

**Exit ready:** an iteration where the gate + id-coverage are green, the griller returns no
`[BLOCKING]`, and the fidelity-eval passes → leave the loop and judge.

**Cap reached:** if after **3 iterations** the spec still blocks on any stage, **STOP and escalate
to the owner** with the open findings. Do not loop forever and do not weaken the spec to force an
exit. On escalation, diagnose the likely root: **repeated fidelity failures** usually mean the
docs are ambiguous/contradictory; a **griller-vs-fidelity squeeze** (the griller wants specificity
the docs don't authorize) is a doc gap, not an author failure — name the exact requirement/
architecture lines to fix, never "the author failed."

## Step 2 — judge + auto-ratify (once, at the end)

Only after the loop exits ready, act as **judge**. Ratify in this order so nothing is committed
that the *ratified-mode* gates would reject downstream:

1. Flip the anchor `docs/specs/NNN-*.md` Status **draft → ratified**.
2. **Re-run the deterministic gate in ratified mode** — `openspec validate <change> --strict`,
   `python scripts/check-specs`, and the handed-id coverage check — now that the anchor is
   `ratified`. This is the exact state `/run-slice` will gate on, and it is the **only** state in
   which `check-specs` *enforces* (not just warns) closed open questions. **RED → flip back to
   `draft`, route the output to the author as rework, re-enter Step 1** (counts against the cap).
   This closes the gap where a draft passes the loop's warn-only gate but the ratified gate — the
   one `/run-slice` runs — rejects it, stranding an unfixable spec defect in the code loop.
3. Green → **commit** the contract **spec-first** (trailers `Slice: NNN-...`, `Refs: <a primary FR
   id>`), exactly as a human-ratified slice would. Only now is it ratified — this is the automated
   ratification the human delegated.

## Step 3 — digest + hand off to /run-slice

- **Emit the digest** to the owner (the agreed "notify, don't block" touchpoint — a ~30-second
  card, NOT the full spec):
  - **Slice + ids** covered; **fidelity** verdict + score.
  - **Auto-resolved decisions** (each open question the author closed, and how).
  - **Seams** consumed (producer → quoted fields) and the seam test that guards them.
  - **Anything the loop was unsure about** / any non-blocking griller MINOR carried forward.
- **Hand off:** invoke [`/run-slice`](run-slice.md) `NNN` — the code loop (test-first RED →
  implement → gated loop → review → trajectory-eval → judge → archive) now runs on the just-ratified
  contract, fully automatically.
- **Be honest about what the digest is** (the owner chose *notify, don't block*): it is an
  **interrupt window**, not a gate. `/run-slice` starts immediately, so for a fast slice the code
  loop may already be building before the owner reads the card — the digest lets them **abort**, it
  does not hold the loop. If the owner later chooses a stricter posture, this is the single line to
  change (emit digest → *await ack* → then hand off).

## Summary of the guarantees this command encodes

- **(a) Human writes docs, not specs.** The owner's control point is the ratified docs; this loop
  authors the spec from them and never edits them (a doc gap escalates).
- **(b) maker≠checker≠judge for specs.** author writes; griller (robustness) ‖ fidelity-eval
  (direction) check in fresh contexts; the orchestrator judges — no agent grades its own spec.
- **(c) Capped, then escalate.** Max 3 iterations; on non-convergence it STOPS and escalates
  (often flagging a doc ambiguity), never weakening the spec to force green.
- **(d) Diagnosis, not rollback.** Findings route to the author as rework; the draft evolves, the
  loop never resets on an LLM verdict.
- **(e) Notify, don't block.** On ratify it emits a digest and chains into `/run-slice`; the human
  is informed, not gating.

## The residual risk this design cannot remove (name it, don't hide it)

Fidelity checks faithfulness **to the docs**; the griller checks **internal robustness**; neither
can catch a spec that faithfully and robustly encodes a **confidently-wrong or self-contradictory
doc** (e.g. a mis-stated `architecture.md` formula). The author escalates *ambiguous* docs but
will faithfully encode *confidently-wrong* ones, and all three checks pass. Since the human's only
control point is the docs, this is inherent to the design — the mitigation is entirely upstream
(the rigor of `requirements.md`/`architecture.md`), and the digest is an after-the-fact catch, not
a guarantee. This is the worst case; it is not a reason to skip the loop, but the owner should know
the loop's ceiling is the docs' correctness.
