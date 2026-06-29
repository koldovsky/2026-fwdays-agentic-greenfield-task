---
name: run-backlog
description: Drive the OpenSpec change backlog through the gated implementation loop — one ready change at a time. (Invoke by hand: /run-backlog [change-id].)
disable-model-invocation: true
---

# Run Backlog

Drive `openspec/backlog.md` through the implementation loop defined in
[ADR-0012](../../../docs/adr/0012-implementation-loop-runner.md): pick one **ready** change, run it
through every **gate**, **commit**, **archive**, repeat. Eval framework is
[ADR-0013](../../../docs/adr/0013-eval-framework.md). You are the **orchestrator**: you are the sole
writer of backlog status, and you enforce **maker ≠ checker** by spawning a *separate* reviewer
subagent — never self-approve.

Two laws hold for the whole run:

- **Sequential.** Exactly one change in flight. `wave` orders *eligibility* only — never run
  wave-mates concurrently.
- **Isolate-and-continue.** A failed gate marks that change `blocked` (+ a one-line reason in the
  backlog) and you move to the next ready change — you do **not** halt the loop. Retry **once** only
  for a *flaky* gate (test/network/rate-limit); a review finding is never auto-retried (route it back
  to a fix, see Review).

## Before the loop

1. Read `openspec/backlog.md` and both ADRs above. Confirm the working tree is clean and you are on
   a work branch (not the default branch); create one if needed.
   *Done when:* branch confirmed, backlog DAG loaded.

## The loop — repeat until no change is ready

Run the gates **in order** for the selected change. Each gate's completion criterion must hold
before the next. If a `npm run` / tool gate is not wired yet (greenfield — e.g. `evals`, `fallow`,
or `typecheck` before `src/` exists), **skip it with a logged note** — do not fail the loop on a
planned-but-absent command.

2. **Select.** Pick the lowest-`wave` change of `kind: agent` with `status: todo` whose every
   `blocked-by` id is `status: done` (or take the `[change-id]` argument if given and it is ready).
   Set its status to `doing`. If the next thing gating progress is a `kind: manual` item (e.g.
   `provision`), **do not run it** — surface its linked runbook, **stop**, and let the human do it +
   flip it `done`.
   *Done when:* one ready agent change is chosen — or none is ready (manual item pending, or backlog
   exhausted), so report the state and **stop**.

3. **Propose.** Run `opsx:propose` for the change, then `openspec validate <id> --strict`
   (structural gate, distinct from coherence). Fix or re-propose until validation passes.
   *Done when:* `validate --strict` exits 0.

4. **Checkpoint 1 — human approves the plan.** Present the proposal/specs/design summary and **wait**
   for explicit approval before any code is written.
   *Done when:* the human approves (or asks for revisions, which you make and re-present).

5. **Apply (maker).** Run `opsx:apply` to implement `tasks.md`. This agent is the **maker**.
   *Done when:* every task in `tasks.md` is checked.

6. **Verify.** Run `opsx:verify` (plan ⇄ implementation coherence).
   *Done when:* verify reports coherent.

7. **Review (checker — maker ≠ checker).** Spawn a **fresh, separate** subagent running the `review`
   skill (Standards + Spec axes). The apply agent may **not** review its own work. Resolve every
   finding (maker fixes, checker re-reviews) — findings are not retried blindly and not waved past.
   *Done when:* the reviewer returns clean.

8. **Test + static gates.** Run `npm test`, then `npm run lint`, `npm run format:check`,
   `npm run typecheck`, and fallow (when wired). All green.
   *Done when:* every wired gate exits 0 (skip-with-note any not yet wired).

9. **Evals.** For the capabilities this change touches, run the suites per ADR-0013
   (`npm run evals` to refresh `evals/results/`, then `npm run check:evals` ratchet). Skip if the
   change touches no capability suite, or the eval scripts are not wired yet.
   *Done when:* the ratchet passes, or the gate is justifiably skipped (logged).

10. **Sync docs.** Update `docs/current-state.md` (milestone/feature/decision lines + date), flip any
    AGENTS.md *planned → live* commands this change made real, then run `npm run docs:check`.
    *Done when:* `docs:check` exits 0.

11. **Commit (local).** One Conventional Commit for the change, ending with the
    `Co-Authored-By: Claude …` trailer. Local only — no push per change (push per wave/milestone; one
    PR at the end, per ADR-0012).
    *Done when:* the commit lands on the work branch.

12. **Checkpoint 2 — human eyeballs before archive.** Show the review outcome + diff and **wait** for
    a go-ahead (archive's spec-sync is sticky).
    *Done when:* the human approves the archive.

13. **Archive.** Run `opsx:archive`, then set the change's `status: done` in the backlog.
    *Done when:* the change is archived and the backlog reflects `done`.

14. **Next.** Return to step 2. A change that just reached `done` may now make dependents **ready**.

## On failure

When a gate fails and is not a one-retry flake: set that change's `status: blocked` in the backlog
with a one-line reason, leave its partial work uncommitted (or on a stash/branch noted in the
reason), and return to **step 2** for the next ready change. Dependents stay `todo` — they simply
never become *ready* while the blocker is unresolved, so no cascade edit is needed.
