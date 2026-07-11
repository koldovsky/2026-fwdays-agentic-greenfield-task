# AGENTS.md

Operating guide for AI agents in this repo. Human docs: [README.md](README.md).
Backend coding rules: [`.claude/skills/python-fastapi/SKILL.md`](.claude/skills/python-fastapi/SKILL.md).

**Stack:** FastAPI + PostgreSQL (async SQLAlchemy/Alembic) · React + Vite + TypeScript.
**Status:** verified skeleton. New behavior starts as a spec in [`docs/specs/`](docs/specs/) — design approved before code (start with the `brainstorming` skill).

## Project context — source of truth
Read before any task. Do not contradict these; propose edits rather than diverging.
- `docs/product-brief.md` — ratified product brief (the north star).
- `docs/requirements.md` — numbered requirements (FR/NFR/TC/BC) with stable IDs.
  Reference IDs in specs, tests, and commit trailers (e.g. `Refs: FR-METR-03`).
- `docs/architecture.md` — engineering design: data model, metric formulas, coach
  contract, sync, undo (resolves O-1..O-9). The HOW behind the requirements.
- `docs/DESIGN.md` — visual/UI design: tokens, screens, components, states.
  Frontend work follows this; icons are SVG, never emoji.
- `docs/positioning.md` — market/positioning rationale (human-facing, non-binding).
- `docs/current-state.md` — current build status. `docs/adr/` — decisions. `docs/specs/` — specs.

## Start here — current state

Read [`docs/current-state.md`](docs/current-state.md) first: current phase, what's done, and the next step. Keep it updated at each milestone (spec approved, capability shipped, blocker changes) with a Kyiv-time timestamp. It is a **handoff aid, not the source of truth** — if it disagrees with code/specs/tests, trust the repo and fix the file.

## Setup & run

```powershell
docker compose up -d db                                          # PostgreSQL
cd backend; python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"; Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload      # http://localhost:8000/docs
cd ..\frontend; npm install; npm run dev                         # http://localhost:5173
```

POSIX venv path is `.venv/bin/python`. `PY` below = the venv python.

## Verify — source of truth (run before claiming anything is done)

```powershell
powershell -File scripts/verify.ps1    # one shot: db → ruff → mypy → alembic → pytest(+DB) → frontend build + unit tests
```

Granular (backend/ unless noted):

```powershell
$PY -m ruff check .                     # lint + import order
$PY -m mypy app                         # types
$PY -m alembic upgrade head             # migrations apply
$env:RUN_DB_TESTS=1; $PY -m pytest -q   # tests, incl. real Postgres connectivity
cd ../frontend; npm run build; npm test # tsc strict + bundle, then vitest unit (slice 003+)
```

"Green" = lint ✓ types ✓ migrations ✓ tests ✓ build ✓ fe-unit ✓. Same checks run in [CI](.github/workflows/ci.yml).

## Roles — maker ≠ checker ≠ judge (never the same pass)

- **Maker** — implements one spec. Writes/updates tests with the change and an Alembic
  migration for every schema change. Follows the `python-fastapi` skill. Does **not** self-approve.
- **Checker** — independent verification. Runs every command under **Verify**, then
  `/code-review` (correctness) and `/security-review` (secrets/security). Confirms the tests
  actually exercise the change. Reports pass/fail **with the command output as evidence**.
- **Judge** — owns the Definition of Done. Scores the change against the spec's acceptance
  checks, adjudicates Checker findings, and (for eval work) rates outputs. **Only the Judge
  marks a task complete.**

## Sub-agents & the loop

The roles above are mechanized as **isolated-context sub-agents** in
[`.claude/agents/`](.claude/agents/), driven by the [`/run-slice`](.claude/commands/run-slice.md)
orchestrator. Each agent runs in a **fresh context**, so `maker ≠ checker ≠ judge` is
structural, not honor-system: a review cannot be the author re-grading themselves.

- **Agents** — `test-engineer` (writes RED tests from the acceptance checks, test-first),
  `capability-implementer` (the maker: product code + migrations to green), `code-reviewer`
  and `security-reviewer` (read-only, independent checkers), and `eval-judge` (a generic
  strict judge that applies a rubric to one case and returns `{score, pass, criteriaMet,
  criteriaMissed, reasoning}`).
- **The loop** (`/run-slice`, owner must ratify the spec first) — test-first RED → implement
  to green → a capped loop of `gate-slice` + parallel review + a **trajectory-eval**
  (eval-judge over [`evals/rubrics/`](evals/rubrics/)). The loop is capped at **3
  iterations** and **escalates to the owner** rather than looping forever or weakening tests
  to force green; the trajectory-eval returns a **diagnosis for rework and never rolls back**
  (no destructive action on an LLM verdict). The **Judge runs once at the end** and is the
  only role that marks a slice done.
- **Rubrics** — the `eval-judge` applies rubrics in [`evals/rubrics/`](evals/rubrics/):
  `trajectory-quality.md` (how a slice was built) now; the coach output-eval rubric + cases
  arrive with slice 006.

## Reporting rules

- **Declare skills first.** Begin every agent report with a `Skills used:` line naming each
  skill you loaded and why (e.g. `Skills used: python-fastapi (backend conventions),
  brainstorming (spec gate)`), or `Skills used: none`. This declaration is complemented by
  **artifact-bound verification** where possible: a skill whose use leaves an artifact is
  verified by that artifact, not by the claim — the spec-before-code (`brainstorming`) gate
  is already enforced by `check-trajectory`, and the frontend skill's "SVG, never emoji"
  rule will be checked by an emoji grep + `check-a11y` at the UI slice.
- Structure every report as **Summary · Changes · Verification · Risks/Follow-ups**.
- Verification means **the commands you ran and their real output** — never "looks good".
- State plainly what you did **not** do, skipped, or couldn't verify. No silent failures.
- Cite code as `path:line`. Be terse; link, don't paste large dumps.
- **Write a run record.** In addition to the chat report, every agent session appends a durable
  record at [`docs/agent-runs/NNN-<slice>-<role>.md`](docs/agent-runs/) following
  [`docs/agent-runs/TEMPLATE.md`](docs/agent-runs/TEMPLATE.md) — the same real-output Verification
  and plain "what was NOT done" bars apply. See [`docs/agent-runs/README.md`](docs/agent-runs/README.md).

## Code style

- Backend: `async` everywhere; all config via `app/config.py` (never read `os.environ`
  elsewhere); DB access via `SessionDep`. Enforced by ruff + mypy — see the `python-fastapi` skill.
- **Auth & isolation (slice 001):** protected routes take the `CurrentUser` dependency
  (`app/api/deps.py`); **every repository method that touches a user's data takes `user_id` and
  scopes every query by it** (FR-AUTH-07) — the only exceptions are the auth-bootstrap methods that
  *establish* identity (see [`app/repos/__init__.py`](backend/app/repos/__init__.py)). Passwords are
  hashed with bcrypt cost 12 via `passlib[bcrypt]` (`app/core/security.py`).
- Frontend: TypeScript strict; all HTTP goes through `src/api.ts`, which sends credentials and
  attaches the CSRF double-submit header (from the `cadence_csrf` cookie) on every mutating request.

## Skills

Canonical in [`.agents/skills/`](.agents/skills/) (cross-agent), mirrored to `.claude/skills/` via `scripts/sync-skills.*` — edit in `.agents/`, then sync. Provenance/audit log: [`.agents/skills/README.md`](.agents/skills/README.md).

- **Before coding a feature:** `brainstorming` (idea → approved spec, hard gate) then `grill-me` (relentless, one-question-at-a-time stress test).
- **Writing backend code:** the `python-fastapi` conventions apply.
- Only add third-party skills whose audits all pass; log them in the README.

## Boundaries & safety

- **Never commit secrets.** `.env*` is git-ignored; commit only `*.env.example`.
- Schema change ⇒ Alembic migration, with the autogenerated SQL hand-reviewed.
- **Skills are a trust boundary** — vet and log audits in
  [`.claude/skills/README.md`](.claude/skills/README.md) before adding third-party ones.
- Don't hand-edit generated/vendored paths: `dist/`, `node_modules/`, `.venv/`, and merged
  files in `backend/alembic/versions/`.
- **Cross-slice overlap (trajectory gate).** `check-trajectory` flags two slices co-editing the
  same **business-logic** module as an ownership conflict. **Entry-point / aggregation files that
  every slice legitimately appends to are allowlisted** and never counted as overlap:
  `backend/app/main.py`, `backend/app/models/__init__.py`, `frontend/src/api.ts`,
  `frontend/src/App.tsx` (the `ENTRY_POINT_ALLOWLIST` in [`scripts/check-trajectory`](scripts/check-trajectory),
  same spirit as the docs/config exclusions). When adding a slice: **append** your router
  registration / HTTP call / model import / screen mount to these (a pure-deletion edit that
  strips another slice's lines is still flagged); put everything else in **new** files — do not
  edit another slice's modules (e.g. `index.css`, `conftest.py`, another router). Keep the
  allowlist small; broadening it needs owner sign-off + the gate self-test
  ([`scripts/tests/test_trajectory_overlap.py`](scripts/tests/test_trajectory_overlap.py)).

## Git & PR

- One branch per change (`feat/…`, `fix/…`); never commit to `main` directly.
- Commits: imperative and scoped, e.g. `backend: add notes endpoint`.
- PRs fill [`.github/pull_request_template.md`](.github/pull_request_template.md); CodeRabbit reviews.

## Definition of done (Judge gate)

1. Meets its `docs/specs/` acceptance checks.
2. `scripts/verify.*` is fully green.
3. Passed an independent Checker (maker ≠ checker) **and** CodeRabbit.
4. No secrets committed; this file / skills updated if conventions changed.
