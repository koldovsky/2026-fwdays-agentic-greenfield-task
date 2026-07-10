---
name: slice-plan
description: Slice the PRD into MVP capability slices and generate or audit docs/mvp-capability-plan.md. Use when the user asks to (re)build the capability plan, audit it against the PRD/agent-plan, or check that a proposed change maps to exactly one slice.
---

# MVP Capability Slicing

Produce or audit `docs/mvp-capability-plan.md` — the working plan of capability
slices derived from `docs/PRD.md`. Written in Ukrainian (it lives in `docs/`).

## Inputs (read in this order)

1. `docs/current-state.md` — where the project is now
2. `docs/mvp-capability-plan.md` — current plan (if it exists; audit mode)
3. `docs/PRD.md` — normative requirements (FR-_/NFR-_/TC-*/BC- codes)
4. `docs/agent-plan.md` — cycle frame Е-1…Е-7 (metrics/reporting frame)
5. `docs/assumptions-open-questions.md` — Р-/П-/В- journal

## Slicing rules (normative)

- **One slice = one capability = one unit of agentic work.**
- **One capability = one real-behavior proof** (the slice is proven by
  observing real behavior, not only by unit tests). Work lands as a
  coherent series of `feat(S-NN):` commits on main — trunk-based, no
  working branches or PRs; the only PR is the final course submission
  (ADR-0008).
- **Vertical**: every slice cuts the full contour UI → API → DB. No
  "backend-only" or "frontend-only" slices.
- **Self-contained**: deployable to production as soon as the slice lands
  on main; the app stays fully working after every slice.
- Slices are ordered by dependency; each maps to an agent-plan cycle (Е-N).
  Cycle order is fixed; a cycle may contain 1–2 slices.
- Scope that does not fit a slice is cut (BC-GOAL-01), not stretched.
- Every FR/NFR of the PRD must be covered by exactly one slice (traced in
  `docs/traceability-matrix.md`); slices must not overlap on FR codes.

## Slice entry format

For each slice:

- **ID** `S-NN` and name
- **Cycle**: Е-N it belongs to
- **Мета** (goal): one sentence, user-visible outcome
- **FR/NFR**: PRD codes covered
- **Вертикальний контур**: what changes in UI / API / DB
- **Acceptance-сценарії**: 2–4 Given/When/Then scenarios (these become the
  Playwright specs of the slice)
- **Залежності**: slice IDs it builds on
- **Non-goals**: what is explicitly out

## Definition of Done (every slice)

1. `proposal.md`, `design.md`, `tasks.md`, spec deltas — all filled and
   validated; all checkboxes in `tasks.md` are `[x]`.
2. `npm run verify` passes (format, lint, typecheck, fallow audit,
   openspec validate, tests, build).
3. Smoke test on a real DB: create / update / delete the slice's data and
   check invariants.
4. E2E scenarios for the slice's critical paths pass in Playwright
   (`web-e2e`), derived from the acceptance scenarios.
5. Adversarial review by the `slice-reviewer` subagent (ADR-0010): clean
   context, different model, one pass over the slice diff.
   `critical`/`high` findings fixed (verify re-run); `medium`/`low` at the
   author's discretion, dispositions logged in the retro.
6. Launch-and-look check: run the app, walk the slice's happy path, confirm
   it works (no recording — note the check in `docs/current-state.md`).
7. `npx openspec validate <change> --strict` — pass; change archived;
   `npx openspec list` empty before declaring the slice done.
8. `docs/current-state.md` updated: phase, done, next 1–2 tasks, blockers.
9. `docs/traceability-matrix.md` updated: FR → spec → test → demo check.
10. Session retrospective via `/slice-retro`: metrics and friction →
    `docs/cycles/S-NN.md`; small process fixes (≤3) applied, normative
    changes proposed to the user.

## Procedure

**Generate mode** (no plan exists): slice the PRD by the rules above, map
slices to agent-plan cycles, write `docs/mvp-capability-plan.md` with the
slice entries, the shared DoD, and a changelog section.

**Audit mode** (plan exists): check every rule — FR coverage is complete and
non-overlapping, slices are vertical and self-contained, dependencies are
acyclic and respected by ordering, cycle mapping preserves the fixed Е-N
order. Report violations with concrete fixes; apply them if asked.

In both modes: if the plan changes what agent-plan.md prescribed, record the
product/process decision as a Р- entry in the journal (+ changelog bumps in
the touched docs). Never edit PRD requirement codes from here.
