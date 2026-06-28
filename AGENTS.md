<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- The block above is tool-managed and may be regenerated. Keep project rules below it, outside the markers. -->

# Project rules — break-reminder

> These rules deliberately trade speed for care. For trivial changes (rename a
> variable, fix a typo) use judgment. Everything below is for real work: features,
> bug fixes, refactors — anything that changes behavior.

## Context & documents

This is **break-reminder** — a small PWA that reminds you to take breaks while you
work, fires reminders while the app is open, and stores "done / snoozed" stats
locally. Learning project for an Agentic Engineering course; the goal is a full
engineering loop through an agent, not a large codebase.

**Always read the docs in `docs/` before planning or writing code** — they are the
source of truth for intent and behavior, and they outrank your assumptions:

1. `docs/product-brief.md` — why and for whom (narrative). Read for intent and tone.
2. `docs/requirements.md` — what, as numbered requirements (`FR/NFR/TC/BC-*`). This
   governs behavior; every change traces back to a requirement ID.
3. `openspec/changes/*/specs/` — the per-capability contract, as GIVEN/WHEN/THEN
   scenarios. This is what tests are written against.
4. `DESIGN.md` (repo root) — the visual system ("Still Water" tokens, the
   breathing-ring signature, motion rules).

You have no memory between sessions. Anything not in these files or the code does
not exist to you. Read before you write — including the Next.js docs in
`node_modules/next/dist/docs/` (see the managed block above).

## Session continuity — `docs/current-state.md`

Because you have no memory between sessions, `docs/current-state.md` is the running
record of where the work stands. Treat it as a required part of every task.

- **At the start of every session**, read `docs/current-state.md` first to learn what
  was done last and what comes next — before touching code or specs.
- **After any meaningful action** (finishing a task or slice, completing or archiving
  an OpenSpec change, making a decision, hitting a blocker), update it.
- It MUST record at least:
  - an ISO 8601 timestamp (UTC) of the last action;
  - what was just done, in one or two lines;
  - the active OpenSpec change / capability and task progress;
  - what's next (the immediate next step);
  - any open questions or blockers.
- Keep it a current snapshot, not a changelog: overwrite stale entries rather than
  letting the file grow without bound. It complements, but never replaces, the
  source-of-truth docs above.

**Stack:** Next.js (App Router) + TypeScript (strict) · React · Tailwind CSS v4
(tokens via `@theme` in `globals.css`) · Dexie.js (IndexedDB) · localStorage
(settings) · Vitest · Serwist (PWA). Notifications via Notification API only —
background push is out of scope.

**Language:** all code, comments, and commits in English.

## Architectural rule #1: pure logic lives in `lib/`

All domain logic (the reminder engine, stats aggregation) lives in **pure
functions under `lib/`, framework-free** — no `next/*`, no `react`, no DOM globals
(TC-PURE-01). This is what makes verification real.

```
lib/
  types.ts            ← Settings, BreakEvent, StatsSummary
  schedule/schedule.ts ← computeNextReminder, computeSnooze, clampToWindow ...
  stats/stats.ts      ← aggregateStats ...
src/
  app/                ← Next.js App Router (UI, pages)
  components/         ← React components
  storage/            ← thin persistence: settings.ts (localStorage), events.ts (Dexie)
```

Rule: anything that can move into `lib/` moves into `lib/`. Components and storage
stay thin. If time logic can't be tested without rendering a component, it's in
the wrong place. Time is passed as an argument (`from: Date`), never read via
`new Date()` inside `lib/`.

## Four behavioral rules

1. **Think before coding.** Two readings of a request → say so, don't guess.
   `requirements.md` governs behavior; the active OpenSpec spec governs the slice;
   `DESIGN.md` governs visuals.
2. **Simplicity first.** Smallest thing that works. No speculative abstractions.
3. **Surgical changes.** Touch only what the task needs.
4. **Not done until the harness is green** and the new behavior has a test. "Seems
   to work" doesn't count.

## Verification harness (loop)

After any meaningful change, run this yourself and repeat until green — don't ask
the human to click:

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx openspec validate --all --strict     # spec contracts are consistent
npx fallow audit                          # codebase intelligence on changed files
```

Work in a loop, not step-by-step prompting: read the active spec scenario → write
a failing test → implement in `lib/` → run the harness → fix → repeat → green.

## maker ≠ checker

After a slice is green, a **separate review pass** (different session) that doesn't
trust the author:

- Every scenario in the active `openspec/changes/*/specs/**/spec.md` is covered by
  a test with the exact input/output from the spec.
- No time logic leaked outside `lib/`; the module stayed framework-free.
- Mutation check: break one branch — a test must turn red. Revert.
- UI follows `DESIGN.md` (tokens, breathing-ring, reduced-motion), not generic
  defaults.

The checker records deviations and hands them back; fixes happen in a separate
pass. When approved, archive the change so its delta applies into
`openspec/specs/`.

## Code style

- TypeScript strict, no `any` (use `unknown` + narrowing if unavoidable).
- Pure `lib/` functions: deterministic, no side effects, JSDoc on exports.
- Comments explain "why," not "what."
- Tailwind: use the `@theme` tokens from `DESIGN.md`; no raw hex in components.

## Out of scope (intentional limits)

No background push when the app is closed · no backend / server DB · no auth or
sync · no native builds (PWA only). If a task pulls past these, stop and ask.
