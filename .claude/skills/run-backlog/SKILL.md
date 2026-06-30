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

## Model per phase

Match each phase to the cheapest model that does its job well — **don't run Opus everywhere**. The
principle: **Opus** only for deep or adversarial judgement; **Sonnet 5** for implementation, coherence
reasoning, and prose; **Haiku** for mechanical tool-running. Escalate a phase one tier *only* when a
light step hits a non-obvious problem (e.g. a red test that needs real diagnosis) — note the bump.

| Phase / gate | Model · effort | Why this tier |
|---|---|---|
| explore (`opsx:explore`, optional) | **Opus · high** | open-ended problem shaping |
| select (step 2) | **Haiku · low** | bookkeeping: pick lowest-wave ready, flip status |
| propose (step 3) | **Opus · high** | spec/design judgement — gets the slice right |
| plan gate (step 4) | **Sonnet · medium** | summarize + judge "critical fork?" |
| apply — maker (step 5) | **Sonnet 5 · max** | high-volume mechanical implementation |
| verify (step 6) | **Sonnet · high** | plan ⇄ impl coherence (careful, not adversarial) |
| improve-arch (step 7) | **Opus · high** | architectural judgement |
| review — checker (step 8) | **Opus · high** | adversarial correctness + standards |
| test + static (step 9) | **Haiku · low** | run npm, report green (→ Sonnet to diagnose a red) |
| evals (step 10) | **Haiku · low** | run scripts + ratchet check |
| sync docs (step 11) | **Sonnet · medium** | accurate current-state edits |
| commit (step 12) | **Haiku · low** | conventional message + git |
| pre-archive gate (step 13) | **Sonnet · medium** | log outcome + judge "critical concern?" |
| archive (step 14) | **Haiku · low** | mechanical move (spec-sync subagent on **Sonnet**) |

Mechanism depends on where the phase runs:

- **Subagent phases** (improve-arch, review, the archive spec-sync): pass `model` (and `effort` where
  the subagent supports it) on the `Agent` call.
- **Main-thread phases** (`opsx:explore`/`propose`/`apply`/`verify`, the mechanical steps): switch the
  session model with `/model` for that phase, or delegate it to a subagent of the target tier. In
  practice, keep the orchestrator on **Sonnet 5** (its natural tier for the gate-running + light steps)
  and delegate **out** to Opus for propose/improve/review and to a Sonnet-max subagent for apply.

## Before the loop

1. Read `openspec/backlog.md` and both ADRs above. Confirm the working tree is clean and you are on
   a work branch (not the default branch); create one if needed.
   *Done when:* branch confirmed, backlog DAG loaded.

## The loop — repeat until no change is ready

Run the gates **in order** for the selected change. Each gate's completion criterion must hold
before the next. If a `npm run` / tool gate is not wired yet (greenfield — e.g. `evals`, `fallow`,
or `typecheck` before `src/` exists), **skip it with a logged note** — do not fail the loop on a
planned-but-absent command.

2. **Select** *(Haiku · low)*. Pick the lowest-`wave` change of `kind: agent` with `status: todo` whose every
   `blocked-by` id is `status: done` (or take the `[change-id]` argument if given and it is ready).
   Set its status to `doing`. If the next thing gating progress is a `kind: manual` item (e.g.
   `provision`), **do not run it** — surface its linked runbook, **stop**, and let the human do it +
   flip it `done`.
   *Done when:* one ready agent change is chosen — or none is ready (manual item pending, or backlog
   exhausted), so report the state and **stop**.

3. **Propose** *(Opus · high)*. Run `opsx:propose` for the change, then `openspec validate <id> --strict`
   (structural gate, distinct from coherence). Fix or re-propose until validation passes.
   *Done when:* `validate --strict` exits 0.

4. **Plan gate (autonomous)** *(Sonnet · medium)*. Log a one-paragraph proposal/specs/design summary and **proceed** —
   do **not** wait for human sign-off. The loop is gate-driven, not approval-driven: validation
   (step 3) is the structural gate; coherence (`opsx:verify`, step 6) and the reviewer subagent
   (step 8) catch a bad plan downstream. **Escalate to the human only on a *critical fork*** — an
   ambiguity or irreversible/architectural decision the gates can't resolve (use `AskUserQuestion`,
   then continue). Otherwise pick the sensible default and keep moving.
   *Done when:* the plan summary is logged and no critical fork is open.

5. **Apply (maker)** *(Sonnet 5 · max)*. Run `opsx:apply` to implement `tasks.md`. This agent
   is the **maker** — run it on Sonnet 5 at max effort (switch the session model or delegate to a
   Sonnet subagent).
   *Done when:* every task in `tasks.md` is checked.

6. **Verify** *(Sonnet · high)*. Run `opsx:verify` (plan ⇄ implementation coherence).
   *Done when:* verify reports coherent.

7. **Improve architecture (refactor scan)** *(Opus · high)*. Run the `improve-codebase-architecture` skill
   scoped to the files this change touched. Apply small, in-scope wins it surfaces (extract types/interfaces,
   dedupe, deepen a module, kill a leaky abstraction) right here — they re-enter the gates below.
   File anything larger as a **new backlog change** rather than expanding this one's scope. This runs
   before review so the reviewer sees the cleaned-up diff.
   *Done when:* the scan is done and its in-scope picks are applied (or logged as follow-up changes).

8. **Review (checker — maker ≠ checker)** *(Opus · high)*. Spawn a **fresh, separate** subagent running the
   `review` skill (Standards + Spec axes), with `model: opus` on the `Agent` call. The apply agent may
   **not** review its own work. Resolve every
   finding (maker fixes, checker re-reviews) — findings are not retried blindly and not waved past.
   *Done when:* the reviewer returns clean.

9. **Test + static gates** *(Haiku · low; → Sonnet to diagnose a red)*. Run `npm test`, then `npm run lint`, `npm run format:check`,
   `npm run typecheck`, and fallow (when wired). All green.
   *Done when:* every wired gate exits 0 (skip-with-note any not yet wired).

10. **Evals** *(Haiku · low)*. For the capabilities this change touches, run the suites per ADR-0013
    (`npm run evals` to refresh `evals/results/`, then `npm run check:evals` ratchet). Skip if the
    change touches no capability suite, or the eval scripts are not wired yet.
    *Done when:* the ratchet passes, or the gate is justifiably skipped (logged).

11. **Sync docs** *(Sonnet · medium)*. Update `docs/current-state.md` (milestone/feature/decision lines + date), flip any
    AGENTS.md *planned → live* commands this change made real, then run `npm run docs:check`.
    *Done when:* `docs:check` exits 0.

12. **Commit (local)** *(Haiku · low)*. One Conventional Commit for the change, ending with the
    `Co-Authored-By: Claude …` trailer. Local only — no push per change (push per wave/milestone; one
    PR at the end, per ADR-0012).
    *Done when:* the commit lands on the work branch.

13. **Pre-archive gate (autonomous)** *(Sonnet · medium)*. Log the review outcome + diff summary and **proceed** to
    archive — do **not** wait for human sign-off. All gates (verify, refactor scan, reviewer subagent,
    tests, static, evals, docs) have already passed by here; archive's spec-sync is the recorded
    consequence of that green state. **Escalate only on a critical concern** the gates didn't cover.
    *Done when:* the review outcome is logged and no critical concern is open.

14. **Archive** *(Haiku · low; spec-sync subagent on Sonnet)*. Run `opsx:archive`, then set the change's `status: done` in the backlog.
    *Done when:* the change is archived and the backlog reflects `done`.

15. **Next.** Return to step 2. A change that just reached `done` may now make dependents **ready**.

## On failure

When a gate fails and is not a one-retry flake: set that change's `status: blocked` in the backlog
with a one-line reason, leave its partial work uncommitted (or on a stash/branch noted in the
reason), and return to **step 2** for the next ready change. Dependents stay `todo` — they simply
never become *ready* while the blocker is unresolved, so no cascade edit is needed.
