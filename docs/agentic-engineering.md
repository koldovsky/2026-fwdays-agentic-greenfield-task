# Applied Agentic Engineering

This project (a small break-reminder PWA) is a learning vehicle for the Agentic
Engineering course: the point is to run a **complete engineering loop through an
agent**, not to ship a large codebase. This document maps each practice to where
it is *described* (the rule) and where it is *evidenced* (the artifact you can
open). The methodology itself lives in [`AGENTS.md`](../AGENTS.md); this file is
the reviewer's index into it.

## 1. Context engineering — static vs dynamic

The agent has no memory between sessions, so context is curated deliberately into
two layers.

**Static context** (stable rules and intent, read before any work):

- [`AGENTS.md`](../AGENTS.md) — project rules: the `lib/` purity law, the stack,
  the four behavioral rules, the verification harness, maker ≠ checker, and the
  intentional out-of-scope limits. [`CLAUDE.md`](../CLAUDE.md) re-exports it.
- [`DESIGN.md`](../DESIGN.md) — the "Still Water" visual system (tokens, the
  breathing-ring signature, motion rules) — the source of truth for the look.
- [`docs/product-brief.md`](product-brief.md) — why and for whom (intent + tone).
- [`docs/requirements.md`](requirements.md) — numbered requirements
  (`FR/NFR/TC/BC-*`); every change traces back to an ID.
- A managed block in `AGENTS.md` pins the agent to the **in-repo Next.js docs**
  (`node_modules/next/dist/docs/`) instead of training-data assumptions.

**Dynamic context** (changes every session):

- [`docs/current-state.md`](current-state.md) — a running snapshot of where the
  work stands: read first each session, overwritten after each meaningful action.
  This is what lets a fresh session continue without re-deriving everything.

**Tooling context** (what the agent is allowed to reach for):

- `.mcp.json`, `.fallowrc.json`, and the skill sets under `.agents/`, `.claude/`,
  `.codex/` (with `skills-lock.json`) — the agent's external capabilities,
  declared in-repo rather than assumed.

## 2. Loop engineering — not step-by-step prompting

Work runs as a closed loop, not a sequence of hand-held prompts. The loop is
defined in `AGENTS.md` → *Verification harness (loop)*:

> read the active spec scenario → write a failing test → implement in `lib/` →
> run the harness → fix → repeat → green.

**Evidence:** the git history on `staging` is one commit per capability in
dependency order (`reminder-engine → settings → shell → notify → stats → pwa`),
each landing green; the harness itself (`npm run lint && typecheck && test &&
build`) is the loop's exit condition.

## 3. Verification — tests/checks, not "seems to work"

"Not done until the harness is green and the new behavior has a test."

- **Pure domain logic in `lib/`** (framework-free, time passed in as `from`,
  never `new Date()`) is what makes verification real — see
  [`lib/schedule/schedule.ts`](../lib/schedule/schedule.ts).
- **Acceptance oracles** encode the spec's exact input/output:
  `AC-REMIND-01..09` in `lib/schedule/schedule.test.ts`, `AC-STATS-01/02` in
  `lib/stats/stats.test.ts` — 58 tests total.
- **Spec consistency:** `openspec validate --all --strict`.
- **Codebase intelligence:** `npx fallow audit`.
- The full command list is in [the README](../README.md#verify-the-project).

## 4. maker ≠ checker — a separate, distrustful review pass

After a slice is green, a separate pass (different session) re-checks it without
trusting the author, on four criteria (see `AGENTS.md` → *maker ≠ checker*):
every scenario covered with exact I/O; no time logic leaked outside `lib/`; a
**mutation check** (break one branch → a test must turn red → revert); and UI
fidelity to `DESIGN.md`.

**Evidence:** the completed checker pass is recorded in
[`docs/current-state.md`](current-state.md) → *What was just done* — criteria
2/3/4 PASS, criterion 1 partial with deviations `DEV-01..05` handed back for a
separate fix pass. The mutation gate is also pinned in the engine tests.

## 5. Specifications first (SDD)

Behavior is specified before it is implemented, as GIVEN/WHEN/THEN scenarios.

- **Per-change contracts:** `openspec/changes/archive/*/` — each capability has a
  `proposal.md`, `design.md`, `tasks.md`, and a delta `specs/**/spec.md`.
- **Living specs of record:** `openspec/specs/{reminder-engine,settings,shell,
  notify,stats,pwa}/spec.md`, produced by archiving each change.
- Tests are written against those scenarios; commit messages name the
  `SDD slice` they implement.

---

### Out of scope (deliberate limits)

No background push when the app is closed, no backend/sync/auth, no native
builds — PWA only. Stated in `AGENTS.md` so the agent stops and asks rather than
scope-creeping.
