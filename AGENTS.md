# Agent instructions — «Неділя на вагах»

This repo uses spec-driven development (SDD) with a two-layer doc model for
context engineering.

## Before writing code

1. Read [`docs/product-overview.md`](docs/product-overview.md) — static context:
   product narrative, user flows, tone, and out-of-scope items.
2. Read [`docs/prd.md`](docs/prd.md) — authoritative spec with stable IDs
   (`FR-*`, `NFR-*`, `TC-*`, `BC-*`).

Do not expand scope beyond the PRD without updating `docs/prd.md` first.

## Project layout

Bot code lives under `nedilya-na-vagakh/` (see `TC-STACK-03`):

- Python 3.11+, `python-telegram-bot`, SQLite
- Unit tests for pure logic (parse, compare, trends, messages) — `NFR-TEST-01`
- Secrets via environment variables — `NFR-OPS-01`
- Dev quality gates: Ruff (lint/format), mypy, pre-commit hooks, GitHub Actions CI
  — run `make check` from `nedilya-na-vagakh/` before archiving a change
- Local env: `make dev-install` creates a Python 3.11 `.venv` (see `nedilya-na-vagakh/README.md`)

## Implementation rules

- Implement against PRD requirement IDs; cite IDs in commit messages where
  practical (e.g. `feat(log): accept comma decimals (FR-LOG-03)`).
- Name tests after the behavior they verify and reference IDs in docstrings or
  test names when helpful (e.g. `test_parse_decimal_comma` → `FR-LOG-03`).
- All user-facing bot text must be Ukrainian — `NFR-I18N-01`.
- Keep tone supportive and non-judgmental — `BC-TONE-01`.
- During `/opsx:apply`, implement and verify against PRD IDs; do not mark
  requirements `shipped` until the change is archived.
- Status lifecycle in `docs/prd.md`: `proposed` → `accepted` → `shipped`
  (or `dropped` if removed from scope).

## OpenSpec workflow

Capabilities are delivered as OpenSpec changes in the order defined in
[`docs/capabilities.md`](docs/capabilities.md). For each capability:

1. `/opsx:propose` — proposal, design, tasks, delta specs.
2. `/opsx:apply` — implement tasks; run `pytest` from `nedilya-na-vagakh/`.
3. `/opsx:archive` — sync delta specs (if any), move the change to
   `openspec/changes/archive/`, then **update PRD statuses** for all
   requirement IDs covered by that change (see the capability map in
   `docs/capabilities.md`) from `accepted` → `shipped`.

Archive only after verification passes (see below). Do not start the next
capability until the current change is archived and PRD rows are updated.

## Verification (maker ≠ checker)

After implementing a capability (before `/opsx:archive`):

1. Run `make check` from `nedilya-na-vagakh/` (Ruff, mypy, pytest). Pre-commit
   hooks run automatically on commit/push if installed via `make dev-install`.
2. Map behavior back to PRD rows — confirm each covered `FR-*` / `NFR-*` /
   `TC-*` for that capability is implemented and covered by code and/or tests.
3. For integration checks, exercise the bot manually or with targeted tests for
   command handlers.

Do not mark requirements `shipped` without passing tests or explicit manual
verification. The `shipped` update belongs in the archive step, not during
apply.

## Out of scope for v1

Do not implement items listed under "Out of scope" in `docs/prd.md` or
`docs/product-overview.md` (OCR, LLM insights, charts, multi-user access, web UI).
