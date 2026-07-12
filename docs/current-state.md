# Current state

Persistent handoff for agents (and humans). **Read this first**, then [`AGENTS.md`](../AGENTS.md).
This is a handoff aid, **not the source of truth** — if it conflicts with code, specs, ADRs, or
tests, verify the repo and update this file.

- **Date and time:** 2026-07-12 (Europe/Kyiv, EEST)
- **Consolidated app branch (`feat/app-final`).** Brings the full backend (slices 001–006, incl. the
  AI coach) together with the frontend redesign + coach drawer into one deliverable for the PR.
- **Frontend redesign + coach drawer (post-005).** The web UI was reskinned 1:1 to the owner's
  "Skills-Kiln" (delibra) dark design system — `frontend/src/delibra.css`, **lime `#84cc16` + Geist**
  (the DESIGN §2 violet/Space-Grotesk deviation was consciously reversed; DESIGN.md updated). New
  components: `CategorySelect` (custom `cdd` dropdown + inline "+ New category"), `DateTimeField`
  (custom calendar replacing native `datetime-local`), `Heatmap` (GitHub-style SVG); `SessionLog`
  moved to Stats. The **AI coach drawer** (FR-SHELL-02) wires the slice-006 backend into the UI — a
  floating button opens a chat panel with the week's grounded insight, a conversational thread (that
  retries transient failures), a mini activity chart, and replies in the user's message language.
  Small backend add: `GET /api/timer/active` (resume a running/paused timer on load — FR-TIMER-06) +
  a pause→resume clock-glitch fix. The coach prompt was empirically tuned (grounded, conversational,
  non-repetitive) and the fallback model pinned to `gemini-flash-latest`. `tsc` strict clean; 55
  coach tests green.
- **Phase:** 6 — slice **006 coach** (the backend AI coach) was built **end-to-end through the
  automated factory** — `/author-slice 6` (the spec autopilot) then `/run-slice 6` (the code loop) —
  and is **engineering-DONE**. The **spec loop** auto-authored the `add-coach` OpenSpec contract from
  the ratified docs and converged over 3 author passes (adversarial griller BLOCKING 6→1→1→0, fidelity
  94→95→96), auto-ratified spec-first (`f2f8fdc`). The **code loop** converged in **two iterations**:
  `gate-slice` GREEN (coverage **97.91% ≥ floor 82%**), `check-traceability` **45/45, 0 gap**
  (FR-COACH-01..07 COVERED), `check-trajectory` **0 violations**, `check-specs` clean, and
  `check-eval-ratchet` **5 programmatic dimensions** hold (the coach output-eval that AGENTS.md said
  "arrives with slice 006"). Both independent reviewers returned **0 BLOCKING**; the `code-reviewer`
  found 3 MINOR edges in the pure grounding validator — including one **false-negative fabrication
  passthrough** (a `uk`-locale comma-decimal) — which were **routed and fixed red-first at root cause**
  (`f1403db`) without weakening a test; `security-reviewer` 0 BLOCKING (`check-secrets` clean, no key
  in history, no IDOR, data-minimized prompt). Trajectory-eval **pass (95)**, Judge **DONE**. `openspec
  archive add-coach` applied → `changes/archive/2026-07-12-add-coach`, the `coach` capability written to
  `openspec/specs/coach/spec.md`. **Delivered (backend + eval only):** a pure, unit-testable
  **grounding validator** (`app/core/grounding.py`) that makes "no fabricated number" (FR-COACH-02, the
  eval's CRITICAL criterion) a mechanical check over the shipped slice-004 `SnapshotResponse`; **one
  provider/degradation ladder** (`gemma-4-31b-it` → one corrective retry → a single `Gemini 3 Flash`
  attempt → a §4.2-conforming fallback card, never crashing — NFR-REL-01); a **read-through weekly
  insight cache** (`coach_insights`, only grounded non-fallback cards cached, degraded cards self-heal);
  **grounded chat** with newest-first 20-turn/~2,000-token memory (`coach_messages`) and both-or-neither
  persistence; the two `POST /api/coach/{insight,chat}` routes behind `CurrentUser` + `require_csrf`;
  and the deterministic **offline eval suite** (`evals/rubrics/coach-output.md`, `evals/cases/coach/*`,
  `docs/qa/eval/{baseline,latest}.json`). One Alembic migration (`0004_coach`) adds `coach_messages` +
  `coach_insights` (it does **not** re-add `users.coach_language`, shipped by slice 001). It **reuses**
  the slice-004 snapshot builder (`StatsService.get_snapshot`) and the slice-001 per-user boundary
  (FR-AUTH-07), and ships **no frontend** — the coach **drawer** (DESIGN §7.5, FR-SHELL-02) is a later
  shell slice. The LLM key is read **only** via `app/config.py::Settings.google_ai_api_key` (wired as a
  separate infra commit `e1739d7`, `Refs: TC-STACK-02`, so it isn't a cross-slice-overlap edit of
  slice-001's config under `Slice: 006-coach`); `backend/.env` is git-ignored and **no secret is
  committed**. Accepted non-blocking follow-ups: per-user **rate-limiting** of the coach endpoints
  (out of slice scope; degrades gracefully); a §4.4 **thousands-separator** grounding refinement
  (a pre-existing extraction-mechanism limitation that errs safe); and a **live smoke test** of the
  real Google AI Studio transport (`# pragma: no cover`) + confirmation that the doc model ids
  `gemma-4-31b-it` / `Gemini 3 Flash` resolve at the API. Same single outstanding DoD sub-item as
  001–005 — **CodeRabbit at PR time**; FR-COACH-01..07 stay `proposed` until it is clean, then flip to
  `shipped`. The owner opens the PR; this loop does **not** push. Trail:
  [`docs/qa/reviews/006.md`](qa/reviews/006.md), records
  [`021`](agent-runs/021-coach-spec-author.md)/[`022`](agent-runs/022-coach-test-engineer.md)/[`023`](agent-runs/023-coach-implementer.md)/[`024`](agent-runs/024-coach-judge.md).
- **Phase (prior):** 5 — slice **005 stats-ui** ran through `/run-slice` in an isolated worktree
  (`.claude/worktrees/005-stats-ui`, branch `feat/005-stats-ui`, based on `feat/004-metrics`) and is
  **engineering-DONE**: the maker≠checker≠judge loop **converged in one iteration**. `gate-slice`
  GREEN (146 passed, coverage 97.47% ≥ floor 82%), `check-traceability` 0 gap (FR-STATS-01..05 all
  COVERED), `check-trajectory` 0 violations, `check-specs` clean; frontend `tsc` strict + vite build
  clean and **vitest 32/32**. Both independent reviewers 0 BLOCKING (`code-reviewer` 2 non-blocking
  MINOR, `security-reviewer` 0 findings, `check-secrets` clean), trajectory-eval **pass (92)**, Judge
  DONE. `openspec archive add-stats-ui` applied → `changes/archive/2026-07-11-add-stats-ui`, the
  `stats-ui` capability written to `openspec/specs/stats-ui/spec.md`. This is a **render-only**
  frontend slice: it draws the shipped slice-004 `GET /api/stats/snapshot` (summary tiles, four zoned
  score cards + a plain streak card, bar/donut/line charts via Chart.js, all four DESIGN §10 states)
  and **composes** the slice-003 `SessionLog` (import + mount only) — recomputing no metric and adding
  no backend endpoint, schema, or migration. The seam test asserts the TS types against a
  backend-generated `SnapshotResponse` JSON Schema, so slice-004 producer drift fails a test. New
  vetted MIT deps: `chart.js` + jsdom + Testing Library (the first jsdom component-test infra in the
  repo). Three snapshot fields are documented, gracefully-degraded follow-up gaps
  (`baselines.streak`, `history_days`, `top_categories[].archived`;
  [`docs/followups/metrics-snapshot-extension.md`](followups/metrics-snapshot-extension.md)). One
  out-of-scope infra fix landed as a traced commit (`20c4469`, `Refs: BC-PROC-01`, no `Slice:` trailer):
  the floating `ruff>=0.6` dev pin now resolves to ruff 0.15.x, which flagged 8 pre-existing import
  blocks in slice-004's metrics tests — cleared by an owner-authorized inert `ruff --fix` import-sort
  rather than editing slice-004 under this slice's ownership. Same single outstanding DoD sub-item as
  001–004 — **CodeRabbit at PR time**; requirements FR-STATS-01..05 stay `proposed` until it is clean,
  then flip to `shipped`. The owner opens the PR; this loop does **not** push. Trail:
  [`docs/qa/reviews/005.md`](qa/reviews/005.md), run records
  [`018`](agent-runs/018-stats-ui-test-engineer.md)/[`019`](agent-runs/019-stats-ui-implementer.md)/[`020`](agent-runs/020-stats-ui-judge.md).
- **Phase (prior):** 4 — slice **004 metrics** _(updated: subsequently **closed, engineering-DONE**
  via the owner-authorized iteration-4 fix `2a7533f` that cleared the 3 escalated performance
  findings; `openspec archive add-metrics` applied, evidence `docs/qa/reviews/004.md` — commit
  `f18738a`. The NOT-DONE narrative below is the state at the 3-iteration cap, kept for the trail.)_
  ran through `/run-slice` in an isolated worktree
  (`.claude/worktrees/004-metrics`, branch `feat/004-metrics`, based on slice 003's tip so it
  reads slice 003's real code, not `spec/004-metrics`'s pre-implementation fork point) and is
  **NOT DONE — STOPPED at the loop's 3-iteration cap and escalated to the owner**, per
  `.claude/commands/run-slice.md`'s explicit rule (a slice still blocking after 3 honest
  iterations needs the owner, not a 4th automated lap). This is the **first slice this
  factory has not converged in one iteration**. `gate-slice` is GREEN (142 passed, coverage
  97.46%), `check-traceability` 0 gap (33/33), `check-trajectory` 0 violations, and 5
  independent review passes (across the 3 iterations) confirmed the 6 metric formulas
  (M1-M6), the §3.7 day-attribution/midnight-split logic, and per-user isolation all correct
  — but **3 open `[BLOCKING]` performance/resource-exhaustion findings remain**, each a
  differently-shaped instance of the same pattern (this slice's compute-on-read design
  repeatedly recomputing over a caller's *entire* session history, unbounded on one axis or
  another): an uncapped `pauses`-array length (measured 5.0s at 100k pauses), un-memoized
  recomputation (21x per request, 1.07-1.28s at the architecture doc's own named 10k-session
  scenario, >2x its <500ms NFR-PERF-01 budget), and an O(days x sessions) re-filter in the
  switching block (5.84s, ~11.7x over budget, at 10k sessions with a legitimate window). 2
  *other* BLOCKING findings this same loop surfaced (an unbounded `window` query-param span;
  a session-span-driven day-walk plus an O(calendar-gap) streak-walk) **were** fixed and
  independently reproduced as actually working, not just green-tested. The Judge step did
  **not** run (it gates on the loop exiting green) and `openspec archive add-metrics` was
  **not** applied — this slice is correctly not marked done. Full detail, every command's
  real output, and the remediation direction for each open finding:
  [`docs/agent-runs/013-metrics-trace.md`](agent-runs/013-metrics-trace.md) (the live trace)
  and [`docs/agent-runs/016-metrics-run.md`](agent-runs/016-metrics-run.md) (the orchestrator's
  final run record). One process note: a mid-session machine restart lost one sub-agent's own
  chat report (iteration 2's implementer); the orchestrator independently re-verified that
  diff from scratch rather than trust or fabricate a report, documented in
  [`docs/agent-runs/015-metrics-implementer.md`](agent-runs/015-metrics-implementer.md).
- **Phase (prior):** 3 — slice **003 timer-sessions** (the product's core loop) ran end-to-end through
  `/run-slice` and is **engineering-DONE**: the maker≠checker≠judge loop converged in **one
  iteration** — `gate-slice` GREEN (70 passed, coverage 96.33%), `check-traceability` 0 gap (all 13
  ids COVERED), `check-trajectory` 0 violations, both independent reviewers 0 BLOCKING,
  trajectory-eval pass (94), Judge DONE. `openspec archive add-timer-sessions` applied
  (`openspec/specs/timer-sessions/spec.md`). **Delivered:** the active timer
  (start/pause/continue/stop+save/confirmed-discard) as the single server-authoritative
  `active_sessions` row with optimistic `version`; the saved-session store with discrete
  `pause_segments` + derived (never-stored) net/gross; manual add/edit/delete; and the 5-second undo
  (immediate write + before-image compensating restore) — reusing slice-001 auth (FR-AUTH-07) and
  slice-002 categories (`category_id` FK). Ran in an **isolated git worktree** after a parallel
  slice-004/005 session contended for the shared checkout (owner-approved; **standing rule: one
  worktree per concurrently-active execution session**). One convention artifact: a minimal **vitest**
  frontend unit runner joined the `verify.*` battery (owner-ratified, for the FR-TIMER-05
  keyboard-shortcut mapper). Same single outstanding DoD sub-item as 001/002 — **CodeRabbit at PR
  time** (no push/PR here; the owner opens it). Full trace:
  [`docs/agent-runs/007-timer-sessions-trace.md`](agent-runs/007-timer-sessions-trace.md); review
  evidence [`docs/qa/reviews/003.md`](qa/reviews/003.md); run record
  [`docs/agent-runs/012-timer-sessions-run.md`](agent-runs/012-timer-sessions-run.md).
- **Phase (prior):** 2 — slice **002 categories** engineering-DONE (loop converged in one iteration;
  `gate-slice` GREEN 27 passed / 97.04%, reviewers 0 BLOCKING, trajectory-eval 93, Judge DONE;
  `openspec archive add-categories` applied). `check-trajectory` gained a tested
  `ENTRY_POINT_ALLOWLIST` (owner-directed, `5a8a3b8`, `Refs: BC-PROC-01`). Trace/records under
  `docs/agent-runs/002-*`.
- **Phase (prior):** 1 — slice **001 email+password auth** is **engineering-complete, independently
  audit-verified GREEN, and its trail is now committed — but NOT yet fully DONE**. An independent
  audit (2026-07-10, see [`docs/agent-runs/001-auth-review-close.md`](agent-runs/001-auth-review-close.md))
  re-ran the gates (`gate-slice` GREEN, exit 0: ruff/mypy/alembic/pytest 11-passed/frontend build +
  coverage 82.97% ≥ 82) and two fresh-context reviewers (code + security) that both returned **0
  BLOCKING**; the code is sound and the tests genuine. The audit **committed the previously-uncommitted
  trail** (`29ae03f`): the `@trace` docstrings, review evidence, and regenerated **8/8** matrices — so
  traceability is now closed in git — after an **owner-authorized** minimal `check-secrets` fix (test
  fixtures skip only the soft assignment heuristic; all hard-credential patterns retained) unblocked
  the sample-password false positive at `test_auth.py:31`. **The one remaining item keeping it from
  DONE: CodeRabbit** has not run (no PR) — DoD item 3. Requirements are still `proposed`, so
  `check-trajectory` correctly reports 001 **in-progress** until CodeRabbit is clean and they flip to
  `shipped`. The **deterministic verification harness** and the **agent layer** (isolated-context
  sub-agents + `/run-slice`) are
  built; see below.

## What exists (done)

- Full-stack skeleton, verified end-to-end (`scripts/verify.ps1` green, exit 0):
  - **Backend** — FastAPI (`/health`, `/health/db`), async SQLAlchemy + Alembic, pydantic-settings,
    pytest (in-process route test + real Postgres connectivity test), ruff + mypy clean.
  - **Frontend** — React + Vite + TS (strict), `npm run build` clean, `npm audit` = 0 vulnerabilities.
  - **Infra** — Docker Compose (Postgres 16); CI runs both stacks.
- **Engineering setup** — `AGENTS.md` (+ `CLAUDE.md`), `docs/specs/` (SDD template), `docs/adr/`,
  and `.agents/skills/` (brainstorming, grill-me/grilling, python-fastapi, find-skills).
- **Deterministic verification harness** (loop-first gates; Python stdlib, no LLM) — built
  2026-07-10:
  - Gate scripts: `scripts/gate-slice` (delegates to `verify.*` then a backend coverage **ratchet**,
    floor in [`docs/qa/coverage-floor.txt`](qa/coverage-floor.txt) = 82); `scripts/check-traceability`
    (FR/NFR → spec → `@trace` test; generates [`docs/qa/traceability.md`](qa/traceability.md));
    `scripts/check-trajectory` (git-visible process facts; generates
    [`docs/qa/trajectory.md`](qa/trajectory.md); carries an explicit **honesty boundary** — it does
    *not* judge test-first order or test-weakening); `scripts/check-eval-ratchet` (coach-eval score
    ratchet, a no-op until slice 006).
  - Inner-loop **Claude hooks** `.claude/hooks/{post-edit-lint,stop-verify}` wired in
    [`.claude/settings.json`](../.claude/settings.json); **git hooks**
    `.githooks/{commit-msg,pre-commit}` (enable: `git config core.hooksPath .githooks`); **CI**
    extended with a `harness` job + the coverage ratchet.
  - Run on slice 001: **gate-slice green**; **check-trajectory** confirms the 001 `Refs:` trailers
    and now records clean review evidence ([`docs/qa/reviews/001.md`](qa/reviews/001.md));
    **check-traceability** is now **8 claimed / 8 traced / 0 gap** — the `@trace FR-AUTH-*` /
    `@trace NFR-SEC-*` docstrings were added during the 001 review-and-close pass. Overview:
    [`docs/qa/README.md`](qa/README.md).
- **OpenSpec spec-contract layer** — added 2026-07-10 (`@fission-ai/openspec@1.5.0`; install with
  `npm ci` at the repo root; pinned in the root [`package.json`](../package.json) and isolated from
  the Python backend). Bootstrap used `npm install --save-dev @fission-ai/openspec@1.5.0` + `openspec
  init --tools none`. See [`openspec/README.md`](../openspec/README.md).
  - Slice 001 recorded **retroactively** as the completed change `add-auth-email` and archived to
    [`openspec/specs/auth/spec.md`](../openspec/specs/auth/spec.md) — 8 requirements (FR-AUTH-01,
    FR-AUTH-02, FR-AUTH-03, FR-AUTH-06, FR-AUTH-07 + NFR-SEC-01, NFR-SEC-02, NFR-SEC-03), each with
    GIVEN/WHEN/THEN scenarios. It documents what was built; it does not re-plan 001.
  - **Bridge decision (Option A):** `docs/specs/NNN-*.md` stays the Python traceability-harness
    anchor and OpenSpec holds the detailed contract, so `check-traceability` / `check-trajectory`
    core logic is **unchanged** (a thin pointer was added to `001-auth-email.md`). Rationale under
    "Decision" in [`openspec/README.md`](../openspec/README.md).
  - **Wired alongside the Python gates:** CI `harness` job runs `python scripts/check-openspec
    --require`; pre-commit runs `openspec validate --all --strict` when a commit touches `openspec/`.
    `openspec validate --all --strict` is green on the 001 contract.
- **Agent layer** (isolated-context sub-agents + the loop orchestrator) — built 2026-07-10:
  - Sub-agents in [`.claude/agents/`](../.claude/agents/): `test-engineer` (RED tests, test-first),
    `capability-implementer` (the maker → green), `code-reviewer` + `security-reviewer` (read-only
    checkers), `eval-judge` (generic strict rubric judge). Each runs in a **fresh context**, so
    maker ≠ checker ≠ judge is structural, not honor-system.
  - Orchestrator [`/run-slice`](../.claude/commands/run-slice.md): owner ratifies the spec → RED →
    implement → **capped 3-iteration loop** (`gate-slice` ‖ parallel review ‖ trajectory-eval) →
    escalate to the owner on non-convergence → **Judge once at the end** → `openspec archive`. The
    trajectory-eval returns a **diagnosis for rework and never rolls back** (no destructive action
    on an LLM verdict).
  - Trajectory rubric
    [`evals/rubrics/trajectory-quality.md`](../evals/rubrics/trajectory-quality.md) — CRITICAL:
    test-first (RED before green) and no test weakened/skipped/deleted to force green; plus scope,
    loop, and honest reporting. This is the LLM judgment layer that `check-trajectory` defers to.
  - `AGENTS.md` gained a `Skills used:` reporting rule + a "Sub-agents & the loop" section;
    `openspec/config.yaml` `context:` now carries the stack + key conventions for slices 002+.
  - **Not yet exercised end-to-end:** the full loop runs only once a ratified slice (002+) is
    queued; this session built and self-checked the agents/orchestrator, it did not run a slice.

## Engineering-verified, not yet DONE (audit-corrected 2026-07-10)

- **Slice 001 — email + password auth** ([`docs/specs/001-auth-email.md`](specs/001-auth-email.md)).
  Independently audited 2026-07-10 ([`docs/agent-runs/001-auth-review-close.md`](agent-runs/001-auth-review-close.md)):
  `gate-slice` GREEN (verify battery + coverage 82.97% ≥ floor 82); two fresh-context reviewers
  (code + security) both **0 BLOCKING**; security spot-check clean; tests genuine, not weakened;
  `test-first` grandfathered (pre-factory single feat commit). The code is engineering-complete and
  sound. The audit **committed the previously-uncommitted trail** (`29ae03f`): the `@trace` docstrings,
  the review evidence, and regenerated **8/8** matrices, so traceability is now closed in git — after
  an **owner-authorized** minimal `check-secrets` fix (test fixtures skip only the soft assignment
  heuristic; all hard-credential patterns retained) cleared the sample-password false positive at
  `test_auth.py:31` (the maker commit `81353b5` had bypassed the secrets gate only because it predates
  the git hooks). The self-attested [`docs/qa/reviews/001.md`](qa/reviews/001.md) (`Result: pass`) is
  corroborated in substance by the audit's independent re-review. **It is NOT yet DONE:** **CodeRabbit**
  has not run (no PR — DoD item 3), and the requirements are still `proposed` (so `check-trajectory`
  reports 001 **in-progress**) until CodeRabbit is clean and they flip to `shipped`.
  - **Backend:** `users` + `user_sessions` tables (one Alembic migration `0001_auth_email`, citext
    enabled); bcrypt cost 12 via `passlib[bcrypt]`; `POST /api/auth/{register,login,logout}` +
    `GET /api/auth/me`; the `CurrentUser` dependency and CSRF double-submit (`app/api/deps.py`); the
    `user_id`-scoped repo layer (`app/repos/`) and `app/services/auth.py`; new auth config in
    `app/config.py`. Session cookie `HttpOnly; SameSite=None; Path=/`, env-driven `Secure`.
  - **Frontend:** auth screen (login/register) per DESIGN §7.1; `src/api.ts` sends credentials and
    attaches the CSRF header; a minimal authenticated placeholder confirms the session.
  - **Tests:** all 8 spec acceptance tests + the password-hash check (`backend/tests/test_auth.py`),
    exercised against real Postgres. Local `scripts/verify.ps1` green (see the PR for evidence).
  - **Out of scope (later slices):** OAuth (009), password reset / email verification (A-5),
    Tailwind adoption, and everything downstream of auth.

## Next steps

0. **Decide how to close out slice 004 (metrics).** `feat/004-metrics` is functionally
   correct and gate-green but carries 3 open `[BLOCKING]` performance findings (see the
   Phase 4 entry above and `docs/agent-runs/013-metrics-trace.md`'s END OF LOOP block for
   full detail + remediation directions). All three look like same-shape, same-file fixes
   to what the loop already shipped twice this run — the orchestrator's read is that an
   owner-approved resumption of `/run-slice 004` targeting just these 3 items would likely
   converge, but did not self-authorize a 4th automated iteration past the process's
   3-iteration cap. Alternative: revisit architecture §1's compute-on-read/no-caching
   NFR-PERF-01 budget directly if the owner judges the numeric target itself (not the
   code) should change. This blocks slice 005 (Stats UI) and slice 006 (coach) only in
   the sense that both build on `GET /api/stats/snapshot` staying within its stated
   latency budget at real scale — neither is blocked on the *shape* of the snapshot,
   which is stable and already what both slices were planned against.
1. **Open the PR** for slice 001 and let **CodeRabbit** review it — the sole remaining DoD sub-item
   (item 3). Carry the accepted MINOR follow-ups forward (dev cookie `SameSite`/`Secure` combo; assert
   `Path=/`/`Secure` in the cookie test; bcrypt off the event loop; 72-byte password bound;
   `session_secret` fail-fast; enforce `check-secrets` on the staged set in CI — it is currently a
   local-hook-only gate). The `@trace` trail + 8/8 matrices are already committed (`29ae03f`).
3. Once CodeRabbit is clean, flip the slice-001 requirement statuses to `shipped` in
   `docs/requirements.md` (the "done" signal `check-trajectory` reads) and regenerate
   `docs/qa/trajectory.md`.
4. **Slice 002 (categories) is engineering-DONE** on `feat/002-categories` (branch left for the
   owner; no push/PR). Open its PR for CodeRabbit — the sole outstanding DoD sub-item — carrying the
   accepted MINOR follow-ups: PATCH `{"name": null}` → 409 not 422 (`schemas/categories.py`);
   server-side hex-color validation once design Open question 5 is resolved; and scope the DB-test
   cleanup per-created-id (or mark the suite serial) so it is safe under parallel pytest.
5. Then proceed to the next ratified slice. Note: an untracked slice-003 (timer/sessions) spec is
   already in the tree (`docs/specs/003-timer-sessions.md`, `openspec/changes/add-timer-sessions/`);
   ratify it before running `/run-slice 003`. It was left untouched by the slice-002 run.

## Key decisions

- Stack + rationale: [`docs/adr/0001-tech-stack.md`](adr/0001-tech-stack.md).
- Third-party skills are vetted for passing security audits before install;
  [`.agents/skills/README.md`](../.agents/skills/README.md) logs each one's status.

## Known blockers / risks

- **Slice 004 (metrics) is DONE** (2026-07-11) — the 3 escalated `[BLOCKING]` performance findings
  were resolved in an owner-authorized iteration-4 targeted fix (`2a7533f`: pause-count cap,
  day-split memoization, linearized switching), independently verified (146 passed, coverage 97.47%,
  wire shape unchanged) and reviewed clean (code + security, 0 BLOCKING — `docs/qa/reviews/004.md`,
  run record `docs/agent-runs/017-metrics-judge.md`). `openspec archive add-metrics` applied.
  Remaining items are accepted non-blocking follow-ups (`docs/followups/metrics-snapshot-extension.md`):
  a cross-slice pause-hydration MINOR, an optional memoization-test strengthening, and the M2
  spillover-day denominator MINOR (owner ruling, not a fix). `feat/004-metrics` is a clean base for
  slice 005 (Stats UI).
- `find-skills` carries a Snyk "Warn" (documented; optional to remove for strict
  all-audits-pass compliance).

## How to verify

`powershell -File scripts/verify.ps1`  (or `bash scripts/verify.sh`) — must be green before "done".
OpenSpec contract: `npm run spec:validate` (= `openspec validate --all --strict`; also run by CI and
by pre-commit when `openspec/` changes).
