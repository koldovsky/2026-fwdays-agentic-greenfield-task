---
name: ship-change
description: Drive the OpenSpec change backlog through the gated implementation loop — one ready change at a time, autonomously: select → propose → apply → verify → dup-gate → improve-arch → review → tests → evals → docs sync → commit → archive, then next. (Invoke by hand: /ship-change [change-id | description].)
disable-model-invocation: true
---

# Ship Change

Drive `openspec/backlog.md` through every gate below, in order, **one ready change at a time**.
You are the **orchestrator**: you run the loop, you are the sole writer of backlog status, you
delegate phases to the named subagents in [`PROFILE.md`](PROFILE.md) — spawning the agent type the
profile maps to each phase (its model tier is baked into the agent frontmatter) — and you enforce
**maker ≠ checker** by spawning a *separate* reviewer subagent. Never self-approve.

This skill is generic; everything repo-specific (commands, branch policy, model tiers, named agents,
extra gates, docs protocol, traps) lives in `PROFILE.md` next to it. **Read `PROFILE.md` first** —
porting this skill to another repo means rewriting only that file.

Four laws hold for the whole run:

- **Sequential — one change in flight.** No argument → auto-select the next *ready* change from the
  DAG (step 2). An argument names an existing `openspec/changes/<id>`, a backlog bullet, or an
  ad-hoc description, and ships only that. `wave` orders *eligibility* only — never run wave-mates
  concurrently.
- **Autonomous — the loop is gate-driven, not approval-driven.** No blocking human sign-off. Log a
  summary at the plan gate (step 4) and pre-archive gate (step 13) and **proceed**. Escalate to the
  human via `AskUserQuestion` **only on a critical fork** — an ambiguity or irreversible/architectural
  decision the gates can't resolve — then continue. Otherwise pick the sensible default and keep moving.
- **Maker ≠ checker.** The subagent that wrote the code never reviews it. Apply (step 5) and review
  (step 8) are always distinct agents, regardless of model.
- **Isolate-and-continue.** A failed gate that isn't a one-retry flake (test/network/rate-limit)
  marks that change `blocked` (+ a one-line reason in the backlog) and you move to the **next** ready
  change — you do not halt the loop. A review finding is never a "flake": route it back to a fix
  (step 8). Dependents stay `todo` and simply never become *ready* while the blocker stands.

If a command a gate needs is not wired yet in this repo (greenfield — per `PROFILE.md`), **skip the
gate with a logged note** — do not fail the loop on a planned-but-absent command.

## The loop — repeat until no change is ready

1. **Preflight** *(orchestrator)*. Read `PROFILE.md`. Confirm the working tree is clean and the
   branch matches the profile's branch policy (a work branch, never the default). Read the ADRs the
   profile names (loop shape + eval framework + model tiering).
   *Done when:* tree clean, branch confirmed, backlog DAG loaded.

2. **Select** *(mechanical tier)*. Pick the lowest-`wave` change the profile's **selection rule**
   marks ready (or take the `[change-id]` argument if given and it is ready). Record
   `git rev-parse HEAD` as the change's **start SHA** — the fixed point every later diff and review
   measures against — and flip its status to `doing`. If the next thing gating progress is a
   `kind: manual` item (e.g. `provision`), **do not run it** — surface its linked runbook and stop.
   *Done when:* one ready change is chosen and its start SHA recorded — or none is ready (manual item
   pending, or backlog exhausted), so report the state and **stop**.

3. **Propose** *(reasoning tier, main thread)*. If the change already has artifacts under
   `openspec/changes/<id>` (resume case), validate them and jump to step 4. Otherwise run
   `opsx:propose`, then `openspec validate <id> --strict` (structural gate, distinct from coherence);
   fix or re-propose until validation passes. Respect the profile's traps (e.g. where `openspec` must
   run from).
   *Done when:* `validate --strict` exits 0.

4. **Plan gate (autonomous)** *(reasoning tier)*. Log a one-paragraph proposal/specs/design summary
   and **proceed** — do not wait for sign-off. Validation (step 3) is the structural gate; coherence
   (step 6) and the reviewer subagent (step 8) catch a bad plan downstream. Escalate only on a
   critical fork (see the autonomous law), then continue.
   *Done when:* the plan summary is logged and no critical fork is open.

5. **Apply — maker** *(subagent, tier per profile)*. Spawn the profile's **maker** agent to run
   `opsx:apply` and implement every task in `tasks.md`. Its prompt must carry the profile's
   **conventions pointers** (skills/docs it loads before coding) and **traps**. Tests ship with code
   in the same change — the maker writes them, not a later step.
   *Done when:* every task in `tasks.md` is checked.

6. **Verify** *(subagent, tier per profile)*. Spawn the profile's **verifier** to run `opsx:verify` —
   plan ⇄ implementation coherence (careful, not adversarial).
   *Done when:* verify reports coherent.

7. **Duplication gate + refactor scan** *(subagent, tier per profile)*.

   **7a — Duplication gate (blocking).** Cross-reference the diff since the start SHA against the
   entire source tree named in the profile's **dup-scan scope** — not just touched files. For every
   new or changed top-level symbol (const, literal/regex, type, function, helper, class, enum,
   prompt/schema) and every notable block of logic: does an equal-or-equivalent one already exist?
   Mechanical pass (grep new symbol names + distinctive literals) plus semantic pass (same logic
   written differently). **The change may never add copy N+1 of anything** — at the second occurrence,
   extract to one home and import it from both sites. Only when deduping *pre-existing* copies is
   genuinely too large may it be deferred — and even then this change must reuse the existing copy,
   never add a new one, and the extraction is filed as a follow-up per the profile's backlog convention.
   *Done when:* the diff introduces zero new duplicates.

   **7b — Refactor scan.** Run the `improve-codebase-architecture` skill scoped to the files this
   change touched. Apply small in-scope wins immediately (they re-enter the gates below); file
   anything larger as a follow-up backlog change rather than expanding this one. Runs before review so
   the checker sees the cleaned-up diff.
   *Done when:* the scan ran and its in-scope picks are applied or filed.

8. **Review — checker** *(fresh subagent, tier per profile)*. Spawn a **separate** checker running the
   profile's **reviewer skill** against the diff since the start SHA. The maker may not review its own
   work. Resolve every finding: maker (or orchestrator) fixes, checker re-reviews. Findings are never
   waved past and never blind-retried.
   *Done when:* the checker returns clean.

9. **Test + static gates** *(subagent, mechanical tier; escalate on red)*. Run every command in the
   profile's **gate commands** list. All green. A red gate gets one retry only if flaky; a real failure
   escalates to a reasoning-tier diagnosis, and the fix re-enters at step 6.
   *Done when:* every wired gate command exits 0 (skip-with-note any not yet wired).

10. **Extra project gates** *(subagent, mechanical tier)*. Run whatever the profile lists under
    **extra gates** (e.g. the eval ratchet in this LLM repo). Skip with a note if the list is empty or
    the change touches no capability the gate covers.
    *Done when:* every listed gate passes or is justifiably skipped (logged).

11. **Docs sync** *(subagent, tier per profile)*. Execute the profile's **docs protocol** — every
    listed item, including its ADR convention: run the ADR trigger test the profile names; if it passes
    and no existing ADR covers the decision, write one now, in this change. Then run the profile's
    docs-check gate.
    *Done when:* every docs-protocol item is done or explicitly n/a and the docs-check gate exits 0.

12. **Commit** *(mechanical tier)*. Commit per the profile's **commit policy** (message convention,
    trailer, branch). Local only — never push unless the profile or the user says so.
    *Done when:* the commit lands on the work branch.

13. **Pre-archive gate (autonomous)** *(reasoning tier)*. Log the review outcome + `git diff --stat`
    summary and **proceed** to archive — do not wait for sign-off. All gates have already passed by
    here; archive's spec-sync is the recorded consequence of that green state. Escalate only on a
    critical concern the gates didn't cover.
    *Done when:* the outcome is logged and no critical concern is open.

14. **Archive** *(mechanical tier; spec-sync per profile tier)*. Run `opsx:archive`, then record the
    change as `done` per the profile's **backlog convention**.
    *Done when:* the change is archived and the backlog reflects `done`.

15. **Next.** Return to step 2. A change that just reached `done` may now make dependents **ready**.
    When no change is ready (manual item pending, or backlog exhausted), report what shipped, the
    commit SHAs, gates passed, and anything deferred or filed as follow-up — then stop.

## On failure

When a gate fails and is not a one-retry flake: set that change's `status: blocked` in the backlog
with a one-line reason, leave its partial work uncommitted (or on a stash/branch noted in the reason),
and return to **step 2** for the next ready change. Dependents stay `todo` — no cascade edit needed.
