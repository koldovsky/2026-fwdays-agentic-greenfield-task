# Current state

Persistent handoff for agents (and humans). **Read this first**, then [`AGENTS.md`](../AGENTS.md).
This is a handoff aid, **not the source of truth** — if it conflicts with code, specs, ADRs, or
tests, verify the repo and update this file.

- **Date and time:** 2026-07-10 09:17 (Europe/Kyiv, EEST)
- **Phase:** 1 — slice **001 email+password auth** implemented by the Maker; **awaiting Checker +
  Judge**. Not yet done (maker ≠ checker ≠ judge). The **deterministic verification harness** (the
  loop-first gate layer) is now built and proven on 001; see below.

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
  - Retroactively run on slice 001: **gate-slice green**; **check-trajectory** confirms the 001
    `Refs:` trailers; **check-traceability FLAGS** that 001's tests carry no `@trace FR-AUTH-*`
    docstrings — a real, recorded gap for the 001 Checker/Judge to close (see Next steps). Overview:
    [`docs/qa/README.md`](qa/README.md).

## In review (implemented by Maker, not yet signed off)

- **Slice 001 — email + password auth** ([`docs/specs/001-auth-email.md`](specs/001-auth-email.md)).
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

1. **Checker** (≠ maker): run `scripts/gate-slice` (verify + ratchet), then `/code-review` +
   `/security-review`; confirm secrets are absent and cookie/hashing attributes are correct; report
   pass/fail with evidence. **Close the traceability gap the harness flagged**: add `@trace FR-AUTH-*`
   / `@trace NFR-SEC-*` docstrings to the covering tests in `backend/tests/test_auth.py` and run
   `python scripts/check-traceability --write`. Do **not** weaken the tests to satisfy it.
2. **Judge:** score slice 001 against its spec acceptance checks + CodeRabbit; commit clean review
   evidence to `docs/qa/reviews/001.md` (`Result: pass`) — `check-trajectory` requires it before a
   slice may be marked done. Only the Judge marks it done.
3. Then proceed to the next ratified slice (brainstorm → spec → maker).

## Key decisions

- Stack + rationale: [`docs/adr/0001-tech-stack.md`](adr/0001-tech-stack.md).
- Third-party skills are vetted for passing security audits before install;
  [`.agents/skills/README.md`](../.agents/skills/README.md) logs each one's status.

## Known blockers / risks

- None blocking. `find-skills` carries a Snyk "Warn" (documented; optional to remove for strict
  all-audits-pass compliance).

## How to verify

`powershell -File scripts/verify.ps1`  (or `bash scripts/verify.sh`) — must be green before "done".
