# 001 - auth - audit (review-and-close verification)

## Run

- **Date:** 2026-07-10 15:46 (Europe/Kyiv)
- **Slice:** 001 (email + password auth)
- **Role:** audit (independent verification of the review-and-close pass; not the maker, checker, or judge that produced it)
- **Branch:** chore/agent-run-records
- **Commits:** `29ae03f` (slice-001 `@trace` trail + owner-authorized `check-secrets` fix + review evidence; matrices regenerated to 8/8) and this record's commit (the agent-run record system + `AGENTS.md` line + `current-state.md`).

## Objective

Independently re-derive - from the repo and its git history, not from any summary - whether slice 001 is genuinely DONE after its review-and-close pass, and stand up a persistent agent-run record system. Change no product code or behavior.

## What was done

- Read the ratified contract (`docs/specs/001-auth-email.md`, `openspec/specs/auth/spec.md`), the requirement text (`docs/requirements.md`), and the full implementation (`app/core/security.py`, `app/api/auth.py`, `app/api/deps.py`, `app/services/auth.py`, `app/repos/*`, `app/models/*`, `app/config.py`, `alembic/versions/0001_auth_email.py`, `backend/tests/test_auth.py`, `frontend/src/api.ts`).
- Ran the deterministic gates myself (real output below): `gate-slice` (full verify battery + coverage ratchet), `check-traceability`, `check-trajectory`, `check-secrets`.
- Ran two independent, fresh-context reviewers on the 001 diff - a `code-reviewer` and a `security-reviewer` - because the only in-repo "review evidence" was a self-attested markdown file. Both returned PASS-WITH-MINORS, 0 BLOCKING.
- Did my own security spot-check of the code against the spec's auth mechanics.
- **Committed the slice-001 trail** that the review-close pass had left uncommitted: the `@trace` docstrings (annotation only), the review evidence, and the regenerated 8/8 matrices - after an **owner-authorized** minimal `check-secrets` fix unblocked it (see Findings B3).
- Established the agent-run record system: `docs/agent-runs/README.md`, `docs/agent-runs/TEMPLATE.md`, this record, and a reporting-rule line in `AGENTS.md`.

## Verification

All commands run by the auditor; real output.

**gate-slice (full battery + coverage ratchet) - GREEN, exit 0** (`python scripts/gate-slice`):

```
==> [3/4] Backend: lint + types + migrations + tests (with DB)
All checks passed!                                  # ruff
Success: no issues found in 21 source files         # mypy
INFO  [alembic.runtime.migration] ...               # alembic upgrade head
11 passed in 8.91s                                  # pytest, RUN_DB_TESTS=1, real Postgres
==> [4/4] Frontend: install + typecheck + build
found 0 vulnerabilities ; vite build OK
==> gate-slice: backend coverage = 82.97%
gate-slice: coverage ratchet OK (82.97% >= floor 82%).
gate-slice: GREEN - stack verified and coverage ratchet held.
GATE_SLICE_EXIT=0
```

Per-step exit status: ruff 0, mypy 0, alembic 0, pytest 0 (11 passed), frontend build 0, coverage 82.97% >= 82.
(Note: `gate-slice` must be driven by a NON-venv Python; `verify.ps1` recreates the venv, which fails if the running interpreter IS the venv python - a Windows self-overwrite, not a code failure.)

**check-traceability** - after committing the `@trace` docstrings, all 8 slice-001 ids are COVERED and the committed matrix is fresh (`8 claimed, 8 traced, 0 gap`, `--check-fresh` exit 0). Mapping verified test-by-test: FR-AUTH-01 (register happy+dup), FR-AUTH-02 (login ok+wrong-pw), FR-AUTH-03 (logout), FR-AUTH-06 (protected-401), FR-AUTH-07 + NFR-SEC-03 (isolation), NFR-SEC-02 (csrf), NFR-SEC-01 (password-hashed).

**check-trajectory** - exit 0, no git-visible process violations. Reports slice 001 as **in-progress** (its requirements are still `proposed` in `docs/requirements.md`, not `shipped`), so the deterministic "done" state has NOT been crossed. Both slice-001 commits (`81353b5`, `29ae03f`) carry the correct trailers.

**check-secrets** - exit 0 when run with no staged files (it scans the staged set; with nothing staged it scans nothing - a vacuous pass; this is how the review-close pass "verified check-secrets clean"). It had FLAGGED `test_auth.py:31` (the sample login password) as a false positive - now fixed (B3): the SOFT assignment heuristic is skipped for test-fixture files, while all high-confidence HARD_PATTERNS still run there. Proof of no weakening: an `AKIA...` AWS key and a `ghp_...` GitHub token planted in a test file are both still caught (exit 1).

**Independent reviewers (fresh context, did not author the code):**
- code-reviewer: PASS-WITH-MINORS, 0 BLOCKING. Confirmed all 8 acceptance checks, migration-vs-model correspondence, repo scoping, and that the tests are genuine (not weakened/vacuous) with correct `@trace` ids.
- security-reviewer: PASS-WITH-MINORS, 0 BLOCKING. Verified bcrypt cost 12 + per-hash salt, opaque 256-bit session token, cookie `HttpOnly; SameSite=None; Path=/` + env Secure, expiry-on-read, fresh token per login (no fixation), scoped logout delete, constant-time CSRF double-submit, per-user isolation (no IDOR), bound-parameter SQL (no injection), only `*.env.example` tracked.

**Security spot-check (auditor):** bcrypt cost 12 (`config.py:44`, asserted by `test_password_stored_hashed` -> `$2b$...`, cost `12`); no plaintext stored or logged (grep of `app/` found zero password logging; `UserRead` omits the hash); cookie attributes correct (`api/auth.py:25-42`); CSRF `secrets.compare_digest` (`api/deps.py:47`); every data-repo method scoped by `user_id`, only the documented identity-bootstrap methods unscoped (`app/repos/__init__.py`). Only `backend/.env.example` + `frontend/.env.example` tracked.

**test-first:** NOT provable and correctly grandfathered. The maker commit `81353b5` bundles tests + implementation in one commit; there is no RED-before-green git trail by construction (slice 001 predates the test-first factory). It must be grandfathered, not claimed as verified.

## Findings

- `[BLOCKING] (for the Definition of Done) AGENTS.md DoD item 3` - **CodeRabbit has not run** (no PR opened). By the project's own Definition of Done ("independent Checker AND CodeRabbit"), slice 001 is not fully done. This is the sole remaining engineering-gate item. (B2 - OPEN)
- `[RESOLVED] docs/current-state.md / whole working tree` - The review-and-close pass had been left **entirely uncommitted** (git showed only maker commit `81353b5`; no committed review/close evidence). The audit committed the trail in `29ae03f`; traceability is now 8/8 in git, review evidence is tracked. (B1 - RESOLVED)
- `[RESOLVED] scripts/check-secrets + backend/tests/test_auth.py:31` - The slice-001 test file could not re-pass the repo's own pre-commit secrets gate (false positive on the sample login password); the maker commit `81353b5` only got in because it **predates the git hooks** (added later in `0464762`). Fixed with an owner-authorized, minimal exemption (test-fixture files skip only the SOFT assignment heuristic; all HARD_PATTERNS retained). (B3 - RESOLVED)
- `[MINOR] scripts/check-secrets (residual)` - `check-secrets` returns a vacuous exit 0 when run with nothing staged, and CI does not run it at all (it is a local-hook-only gate). Consider running it on the staged set in CI so the secrets gate is enforced server-side, not only on machines that enabled the git hook.
- `[MINOR] backend/app/config.py:33-35` - `SameSite=None` with `Secure=false` (dev default) is a cookie real browsers reject; the shipped frontend placeholder would fail to authenticate against a local http backend. Per ratified Resolved #2, so not a spec violation, but a real dev-UX trap the httpx tests mask. Not recorded in the checker's `docs/qa/reviews/001.md`.
- `[MINOR] backend/tests/test_auth.py:135-136` - the login cookie test asserts `HttpOnly` + `SameSite=none` but NOT `Path=/` or `Secure`, though the NFR-SEC-02 scenario names `Path=/`; a regression dropping those would not be caught. Not recorded in `docs/qa/reviews/001.md`.
- `[MINOR] backend/app/services/auth.py:49,68` - bcrypt hash/verify run on the event loop (blocks concurrency; correct output). Matches the recorded follow-ups.
- `[MINOR] backend/app/config.py:27` - `session_secret` ships a known dev default; not consumed at runtime yet (grep-confirmed), so no current exposure. Fail-fast outside dev before slice 009 consumes it.
- `[MINOR] backend/app/schemas/auth.py:18,35` - password bound is 72 characters vs bcrypt's 72 bytes; multi-byte passwords can be silently truncated.
- `[MINOR] backend/app/api/auth.py:77` - `/login` is CSRF-exempt though it mutates (it bootstraps the token); documented and standard.
- `[MINOR] register 409` - duplicate-registration returns a distinct 409, permitting account enumeration; spec-mandated (FR-AUTH-01), accepted tradeoff.

## Verdict

**Slice 001 is engineering-complete, independently verified GREEN, and its trail is now committed - but it is NOT yet fully DONE.**

- Substance: the code correctly implements all 8 acceptance checks; `gate-slice` is GREEN (exit 0); both independent reviewers returned 0 BLOCKING; the security spot-check is clean; the tests are genuine and not weakened. Traceability is now 8/8 COVERED and fresh in git; review evidence is committed.
- Why not DONE: **CodeRabbit has not run** (DoD item 3, B2) - it reviews a PR and none is open. And the requirements are still `proposed`, so `check-trajectory` correctly reports 001 **in-progress**; they should flip to `shipped` only after CodeRabbit is clean.
- The review-close pass's "engineering-DONE" claim was substantively accurate for the code, but overstated status: at audit time nothing was committed, traceability was a working-tree-only 8/8, and the closure could not pass the repo's own secrets gate. Those are now resolved (B1, B3); CodeRabbit remains.

## What was NOT done / follow-ups

- **Did NOT run CodeRabbit** (needs an open PR) - the sole remaining DoD gate. Open the PR next; then flip the slice-001 requirement statuses to `shipped` and regenerate `docs/qa/trajectory.md`.
- **Did NOT** flip requirement statuses to `shipped` (correct - gated on CodeRabbit) or change any product code/behavior.
- **Slice-002 WIP set aside:** an untracked slice-002 (categories) spec + OpenSpec change were concurrently present in the shared tree; to keep this commit from referencing uncommitted 002, they were stashed (`git stash` message "slice-002 WIP set aside by 001 audit"). Restore with `git stash pop`.
- Recommended MINOR follow-ups to carry forward: enforce `check-secrets` in CI; dev cookie `SameSite`/`Secure` combination (config.py:33-35); assert `Path=/`/`Secure` in the cookie test (test_auth.py:135-136); bcrypt off the event loop; 72-byte password bound; `session_secret` fail-fast.
