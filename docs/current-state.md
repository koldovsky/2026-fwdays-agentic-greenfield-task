# Current state

Persistent handoff for agents (and humans). **Read this first**, then [`AGENTS.md`](../AGENTS.md).
This is a handoff aid, **not the source of truth** — if it conflicts with code, specs, ADRs, or
tests, verify the repo and update this file.

- **Date and time:** 2026-07-10 15:46 (Europe/Kyiv, EEST)
- **Phase:** 1 — slice **001 email+password auth** is **engineering-complete, independently
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

1. **Open the PR** for slice 001 and let **CodeRabbit** review it — the sole remaining DoD sub-item
   (item 3). Carry the accepted MINOR follow-ups forward (dev cookie `SameSite`/`Secure` combo; assert
   `Path=/`/`Secure` in the cookie test; bcrypt off the event loop; 72-byte password bound;
   `session_secret` fail-fast; enforce `check-secrets` on the staged set in CI — it is currently a
   local-hook-only gate). The `@trace` trail + 8/8 matrices are already committed (`29ae03f`).
3. Once CodeRabbit is clean, flip the slice-001 requirement statuses to `shipped` in
   `docs/requirements.md` (the "done" signal `check-trajectory` reads) and regenerate
   `docs/qa/trajectory.md`.
4. Then proceed to the next ratified slice through `/run-slice` (brainstorm → OpenSpec change → RED →
   maker → gated loop → Judge). Note: an untracked slice-002 (categories) spec has already appeared in
   the tree (`docs/specs/002-categories.md`, `openspec/changes/add-categories/`).

## Key decisions

- Stack + rationale: [`docs/adr/0001-tech-stack.md`](adr/0001-tech-stack.md).
- Third-party skills are vetted for passing security audits before install;
  [`.agents/skills/README.md`](../.agents/skills/README.md) logs each one's status.

## Known blockers / risks

- None blocking. `find-skills` carries a Snyk "Warn" (documented; optional to remove for strict
  all-audits-pass compliance).

## How to verify

`powershell -File scripts/verify.ps1`  (or `bash scripts/verify.sh`) — must be green before "done".
OpenSpec contract: `npm run spec:validate` (= `openspec validate --all --strict`; also run by CI and
by pre-commit when `openspec/` changes).
