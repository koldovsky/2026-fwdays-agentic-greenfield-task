# 004 — Metrics engine & heatmap — live orchestration trace

Live, append-only debug trace of the `/run-slice` factory executing slice **004
(metrics)** — the pure metrics engine, activity heatmap, and the architecture §4.1
snapshot. Written **as the run happens**, one entry per stage, chronological. Each entry
records: Kyiv timestamp · STAGE · sub-agent invoked · `Skills used:` · RESULT · DECISION
on failure. Every loop iteration and its trigger is visible here, exactly as the
slice-002/003 traces did.

- **Branch:** `feat/004-metrics` (from `2b76fd2`, the slice-003 tip — 001 auth, 002
  categories, 003 timer-sessions are the reuse base).
- **Worktree:** `.claude/worktrees/004-metrics` (isolated per the standing rule from the
  003 incident: one worktree per concurrently-active session; 003's own worktree at
  `.claude/worktrees/003-timer-sessions` and 005's shared-tree session on
  `spec/005-stats-ui` are both left untouched).
- **Contract:** `openspec/changes/add-metrics/` (ratified on `spec/004-metrics`, tip
  `a2e04b4`) + anchor `docs/specs/004-metrics.md`.
- **Orchestrator:** run-slice (this session). Sub-agents run in fresh, isolated contexts.

---

## 2026-07-11 05:15 (Europe/Kyiv, EEST) — STAGE 0a: Preflight / context load

- **Actor:** orchestrator (no sub-agent). **Skills used:** none (orchestration; each
  sub-agent declares its own skills in its own report).
- **Did:** Read the run mandate's claim that `add-metrics` is "ratified... all 5 open
  questions resolved" and verified it against the actual repo rather than trusting the
  stale draft sitting untracked in the shared tree (`docs/specs/004-metrics.md` there
  still read "Status: draft", pre-ratification). Git archaeology:
  - `git log --all --oneline --graph` showed the real topology: `spec/004-metrics`
    (`cfdebb4` ratify → `19a043f` fix anchor claims → `a2e04b4` extend snapshot for
    slice-005) forked from `2697dc3` (the slice-003 **contract** ratification), i.e.
    **before** slice 003's implementation commits. `feat/003-timer-sessions` forked from
    the same point and carries the actual sessions/pause_segments code
    (`0220018`..`2b76fd2`).
  - Diffed file sets: slice-003 impl touches 58 files (backend/frontend/tests/docs);
    `spec/004-metrics`'s 3 commits touch only 9 doc/OpenSpec files, 2 of which
    (`docs/qa/traceability.md`, `docs/qa/trajectory.md`) are generated reports also
    touched by slice 003 — a guaranteed merge conflict on machine-generated output.
  - **Decision:** branch `feat/004-metrics` from `feat/003-timer-sessions` tip `2b76fd2`
    (so the metrics engine can read slice 003's real repos/models), then import just the
    ratified contract paths from `spec/004-metrics` via `git checkout spec/004-metrics --
    docs/specs/004-metrics.md openspec/changes/add-metrics` (no merge, no conflict on
    generated files — those are regenerated fresh by the hooks instead).
  - Read the **ratified** contract at the `spec/004-metrics` tip directly (`git show`),
    not the stale draft: `docs/specs/004-metrics.md` (Status: ratified), `design.md` (Open
    questions: **none** — all 5 resolved + 3 owner-approved additive snapshot extensions
    from the slice-005-planning follow-up commit `a2e04b4`), `proposal.md`,
    `tasks.md`, and the full `specs/metrics/spec.md` (**10 requirements, 50
    GIVEN/WHEN/THEN scenarios**).
  - Read `docs/architecture.md` in full: §1 (layering, compute-on-read decision, <500ms
    budget), §2.2 (net/gross derivation, already implemented by slice 003), §3.1-§3.9 (all
    six metric formulas + day attribution + sparse-data + heatmap buckets — authoritative
    for formulas/thresholds), §4.1 (the snapshot shape — **its literal JSON example
    predates the ratified extensions**; design.md says so explicitly), §7 (archived
    categories stay valid FKs, count in metrics), §9 (module layout, test seams), §10
    (API surface sketch).
  - Read `.claude/commands/run-slice.md`, all five agent definitions
    (`test-engineer`, `capability-implementer`, `code-reviewer`, `security-reviewer`,
    `eval-judge`), `evals/rubrics/trajectory-quality.md`, `AGENTS.md` in full.
  - Read `scripts/check-trajectory` **in full** (not just AGENTS.md's summary) to get the
    exact `classify_cross_slice` mechanics — see STAGE 0a finding below.
  - Read slice 003's completed trace (`docs/agent-runs/007-timer-sessions-trace.md` at
    the `feat/003-timer-sessions` tip, 334 lines — the shared-tree copy is a stale
    snapshot frozen at the concurrency incident) for the worktree-isolation precedent:
    `.claude/worktrees/<NNN-name>` location, `COMPOSE_PROJECT_NAME` pinning so `docker
    compose` reuses the shared Postgres instead of spinning a second one on 5432.
  - Read the existing reuse surface: `app/core/model.py` (`SessionData`/`PauseData`,
    explicitly docstring-designed for slice-004 reuse), `app/core/durations.py`
    (`gross_seconds`/`net_seconds`), `app/repos/sessions.py` (`SessionRepo.list(user_id=)`
    returns **all** saved sessions unfiltered — reusable as-is), `app/repos/categories.py`
    (`CategoryRepository` — only `list_active()`, which **excludes** archived; slice 004
    needs archived rows too, per §7 and the ratified `top_categories`/`per_category_per_day`
    scenarios), `app/api/deps.py` (`CurrentUser`), `app/models/{session,category,user,
    pause_segment}.py` (field names, `users.timezone` default `'UTC'`), `app/main.py`
    (router registration — on the `ENTRY_POINT_ALLOWLIST`), and `backend/tests/{conftest.py,
    test_sessions.py}` for the per-file domain-scoped DB-cleanup fixture pattern
    (`@sess003.local`, `DELETE FROM users WHERE email LIKE '%<domain>'`).
- **Finding (load-bearing for the implement step):** `scripts/check-trajectory`'s
  `classify_cross_slice` flags **any** shared non-allowlisted path between two slices'
  commits as a hard violation (exit 1). `backend/app/core/model.py` is a business-logic
  module (`backend/app/` prefix) and is **not** on `ENTRY_POINT_ALLOWLIST`
  (`main.py`, `models/__init__.py`, `frontend/src/api.ts`, `frontend/src/App.tsx` only).
  Slice 003 already touched `model.py`. **Consequence: the implementer must not edit
  `app/core/model.py`** — reuse `SessionData`/`PauseData` read-only; any extra field
  metrics functions need (e.g. `category_id` per session for M4) must live in a **new**
  slice-004-owned dataclass in a **new** file. Same rule applies to `app/repos/sessions.py`
  and `app/repos/categories.py` — reuse `SessionRepo.list()` verbatim; add the
  archived-inclusive category read as a **new** repo module.
- **RESULT:** Contract clear, internally consistent, and verified against real git state
  rather than the run mandate's summary. Scope = M1-M6 pure metric engine, day
  attribution/midnight split, heatmap bucketing, the extended §4.1 snapshot assembler,
  two read-only endpoints behind `CurrentUser`. No migration. Reuses slices 001/002/003
  read-only.

## 2026-07-11 05:20 (Europe/Kyiv, EEST) — STAGE 0b: Preconditions

- **Precondition 1 (ratified):** confirmed independently above — `docs/specs/004-metrics.md`
  Status is `ratified` at the `spec/004-metrics` tip, and `openspec validate add-metrics
  --strict` passes (verified again after import below). Slice 003 precondition ("DONE"):
  confirmed via `feat/003-timer-sessions`'s own `docs/current-state.md`
  (Phase 3, engineering-DONE, Judge DONE, `openspec archive add-timer-sessions` applied).
- **Precondition 2 (isolated worktree, owner-mandated by the 003 incident):**
  `git worktree add -b feat/004-metrics .claude/worktrees/004-metrics
  feat/003-timer-sessions`, then `EnterWorktree` (path) to re-home this session.
  Verified isolation: cwd is the worktree, branch `feat/004-metrics`, clean tree,
  `HEAD = 2b76fd2`. Did **not** touch `.claude/worktrees/003-timer-sessions` or the
  shared main tree's checked-out `spec/005-stats-ui` branch.
- **Known hazard carried from slices 002/003 (DB test isolation).** The autouse
  cleanup fixtures delete users by `email LIKE '%<domain>'` per test file; two pytest
  processes on the same Postgres wipe each other's in-flight rows. **Mitigation (no
  gate/config change, same as 003):** every DB-touching step runs **strictly serially**
  — sub-agents synchronous, the orchestrator runs the authoritative `gate-slice` in the
  foreground, reviewers are told **not** to run pytest/gate-slice themselves (static diff
  review only; the orchestrator supplies the serial gate output). Slice-004's DB-backed
  tests use their own distinct domain and a per-file cleanup fixture, in **new** files.
- **RESULT:** Preconditions met. Proceed to bringing the ratified contract onto the
  branch, then Step 0 (RED tests).

## 2026-07-11 05:32 (Europe/Kyiv, EEST) — STAGE 0c: Contract import + environment bootstrap

- **Actor:** orchestrator. **Skills used:** none.
- **Did:**
  - `git checkout spec/004-metrics -- docs/specs/004-metrics.md
    openspec/changes/add-metrics` (path-scoped import, not a merge — sidesteps the
    generated-file conflict identified in 0a) → committed `93517e3`
    `docs(metrics): bring the owner-ratified slice 004 contract onto feat/004-metrics`
    (`Refs: FR-METR-01`, `Slice: 004-metrics`).
  - **Pre-commit hook (real output):** `check-traceability` → `docs/qa/traceability.md`
    (33 claimed, 24 traced, 9 gap — the 9 slice-004 ids are the expected spec-first GAP);
    `check-trajectory` → `docs/qa/trajectory.md` (**3 slices, 0 violations**);
    `openspec validate --all --strict` → `4 passed, 0 failed` (change/add-metrics +
    spec/auth + spec/categories + spec/timer-sessions).
  - Environment bootstrap: `npm install` at repo root (OpenSpec CLI) →
    `npx openspec validate add-metrics --strict` → `Change 'add-metrics' is valid`.
    `COMPOSE_PROJECT_NAME=2026-fwdays-agentic-greenfield-task docker compose -f
    docker-compose.yml up -d db` → reused the **existing** container
    `2026-fwdays-agentic-greenfield-task-db-1` (confirmed via `docker ps`; no second
    Postgres spun up). Backend venv: `python -m venv .venv` (system Python, per the
    known "verify.ps1 recreates the venv" hazard — never invoke the gate through a venv
    interpreter that might get overwritten) → `pip install -e ".[dev]"` clean.
    `alembic upgrade head` → no-op (already at head against slice 003's schema, confirms
    **no migration needed**, as the contract requires). `ruff check .` → all checks
    passed. `mypy app` → Success: no issues found in 43 source files.
- **RESULT:** Clean baseline inherited from slice 003, ratified contract on-branch,
  DB isolation confirmed working. Proceed to Step 0 (RED tests).

## 2026-07-11 06:40 (Europe/Kyiv, EEST) — STAGE 1: RED tests

- **Sub-agent:** `test-engineer` (fresh isolated context, worktree-pinned, **synchronous**).
  **Skills used (self-declared):** python-fastapi (test conventions).
- **Did:** encoded all 50 ratified GIVEN/WHEN/THEN scenarios 1:1 (plus 4 supporting
  wiring tests) across 10 new files under `backend/tests/` — 9 pure `app/core`
  unit-test modules (no DB) mirroring the M1-M6/days/heatmap/snapshot module layout, plus
  `test_stats_api.py` (DB-backed, `@stats004.local` cleanup fixture mirroring
  `test_sessions.py`). Designed and documented the not-yet-existing pure-core API
  (`app/core/metrics/{model,days,m1_volume..m6_baseline,heatmap}.py`,
  `app/core/snapshot.py`) as the executable contract the implementer builds to. Made two
  required judgment calls where the ratified text underspecifies wire shape (documented
  in its report): the M2 low-confidence JSON shape, and `switching.per_day`'s window
  scoping (treated like `volume.per_day`) + the heatmap/window-param wire syntax.
  Flagged an environment finding: this machine's Python has no `tzdata` package, so
  `zoneinfo.ZoneInfo(...)` fails even for `"UTC"` — `days.py` will need `tzdata` added to
  `backend/pyproject.toml`.
- **Verification (orchestrator, independently re-run — not just trusting the report):**

  ```
  cd backend; RUN_DB_TESTS=1 ./.venv/Scripts/python.exe -m pytest -q
  -> 54 failed, 70 passed in 50.78s   (exact match to the sub-agent's own count)
  ```

  Grepped every distinct `E   ...Error` line across the run: exactly two, matching all
  54 failures — `ModuleNotFoundError: No module named 'app.core.metrics'` (49) and
  `AssertionError: {"detail":"Not Found"}` (5, the two not-yet-registered endpoints).
  No collection errors, no fixture typos masquerading as the real failure. The 70
  pre-existing slice 001-003 tests still pass — no regression. `git status --porcelain`
  confirms only the 10 new test files changed; nothing under `backend/app/` touched.
  Independently reproduced the `tzdata` finding: `ZoneInfo("UTC")` raises
  `ZoneInfoNotFoundError` on this machine right now — confirmed real, not a false alarm.
  Spot-read `test_metrics_m6_baseline.py` in full: specific numeric assertions (not
  vacuous), a documented rationale for every judgment call, `_load()` imports scoped
  per-test for a clean `ModuleNotFoundError` at RED.
- **RESULT:** RED bar genuinely ready — every failure is "the behavior doesn't exist
  yet", not a broken test. Committed `<pending>`
  `test(metrics): RED acceptance tests for the 004 contract` (`Slice: 004-metrics`) —
  test-engineer does not commit its own work in this loop (orchestrator reviews the diff
  first, per this session's explicit instruction to the sub-agent).
- **DECISION:** Proceed to Step 1 (implement to green), briefing the implementer with:
  the pure-core API shape test-engineer pinned, the `model.py`/repo reuse boundaries from
  STAGE 0a, and the `tzdata` dependency gap to fix as their first step.

---
