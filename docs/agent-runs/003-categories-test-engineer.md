# 003 - categories - test-engineer

## Run

- **Date:** 2026-07-10 17:54 (Europe/Kyiv)
- **Slice:** 002-categories
- **Role:** test-engineer (test-first RED author; isolated context, does not implement)
- **Branch:** feat/002-categories
- **Commits:** (none - RED bar left for the orchestrator/loop to commit; no product code touched)

## Objective

Turn slice 002's ratified acceptance checks (10 GIVEN/WHEN/THEN scenarios for FR-CAT-01/02/03)
into failing acceptance tests that pass only once per-user category CRUD + delete-as-archive is
correctly implemented. Hand the loop a RED bar. Tests only.

## What was done

- Added `backend/tests/test_categories.py` (new; the only product-tree file created) - 10 in-process
  HTTP tests, one per OpenSpec scenario, mirroring the `test_auth.py` conventions: module-level
  `pytestmark = skipif(RUN_DB_TESTS != "1")`, `make_client()` (isolated cookie jar via
  `ASGITransport`), `register_and_login()` returning the CSRF token, an autouse cleanup fixture that
  `DELETE`s users under the dedicated `@cat-test.local` domain (relies on the future
  `categories.user_id` FK `ON DELETE CASCADE`; the `categories` table is never named in cleanup), and
  DB assertions via `get_sessionmaker()` + `sqlalchemy.text()` bound params. Cookie/CSRF names come
  from `app.config.get_settings()`. Used the shared `client` fixture from `conftest.py` (not edited).
- Test <-> requirement map (line = `async def`; each `@trace` in the test function docstring;
  canonical two-digit ids; all under `backend/tests/test_categories.py`):
  - **FR-CAT-01** - `test_create_category_happy_path:134` (201 + row owned by user),
    `test_same_name_allowed_for_two_users:160` (two users, both 201),
    `test_duplicate_active_name_rejected:183` (409 + no second row).
  - **FR-CAT-02** - `test_edit_updates_name_color_description:209` (200 + name/color/description
    updated), `test_rename_onto_existing_active_name_rejected:233` (409, both rows unchanged),
    `test_user_cannot_edit_another_users_category:253` (cross-user PATCH -> 404, unchanged).
  - **FR-CAT-03** - `test_delete_archives_category:280` (204 + `archived_at` set + excluded from
    GET), `test_archived_category_excluded_from_active_list:302` (GET returns only the active one),
    `test_delete_category_with_no_sessions_removed_from_active_list:324` (204 + gone from active
    list; weaker guarantee only, physical row not probed),
    `test_user_cannot_delete_another_users_category:347` (cross-user DELETE -> 404, `archived_at`
    still NULL).
- Encoded delete as its ratified **observable** contract per the change's design Open question 1:
  the archive scenario asserts `archived_at IS NOT NULL` + exclusion from `GET`; the "may
  hard-delete" scenario asserts only 204 + gone-from-active-list (no physical-delete assertion, so it
  never contradicts the archive test). No tests for unarchive, hard-delete-of-a-row, per-card stats,
  or server-side hex validation (all out of the ratified scope).
- Regenerated `docs/qa/traceability.md` with `--write`: FR-CAT-01/02/03 flip GAP -> COVERED,
  attributed to the 10 new tests (3 + 3 + 4).

## Verification

Real commands and output.

```
$ backend $ ./.venv/Scripts/python.exe -m ruff check tests/test_categories.py
All checks passed!
EXIT=0
```

```
$ backend $ RUN_DB_TESTS=1 ./.venv/Scripts/python.exe -m pytest tests/test_categories.py -q
FFFFFFFFFF                                                               [100%]
... (10 failures) ...
10 failed in 11.43s
EXIT=1
```

Every one of the 10 tests fails for the **right reason**: `assert 404 == 201` (or the same inside the
`_create` helper at `:86`) - i.e. `POST /api/categories` responds `404 {"detail":"Not Found"}`
because the categories router does not exist yet. Auth register/login setup succeeds, so each test
reaches the absent categories endpoint and fails on the specific status assertion; there is no
`SyntaxError`, `ImportError`, collection error, or fixture typo. Per-test one-line reason (all
identical in kind - route absent):

- `test_create_category_happy_path` - POST /api/categories -> 404, expected 201 (assert `:148`).
- `test_same_name_allowed_for_two_users` - user A POST -> 404, expected 201 (assert `:174`).
- `test_duplicate_active_name_rejected` - first POST -> 404, expected 201 (assert `:195`).
- `test_edit_updates_name_color_description` - create (helper) POST -> 404, expected 201 (`:86`).
- `test_rename_onto_existing_active_name_rejected` - create (helper) POST -> 404, expected 201 (`:86`).
- `test_user_cannot_edit_another_users_category` - A's create (helper) POST -> 404, expected 201 (`:86`).
- `test_delete_archives_category` - create (helper) POST -> 404, expected 201 (`:86`).
- `test_archived_category_excluded_from_active_list` - create (helper) POST -> 404, expected 201 (`:86`).
- `test_delete_category_with_no_sessions_removed_from_active_list` - create (helper) POST -> 404, expected 201 (`:86`).
- `test_user_cannot_delete_another_users_category` - A's create (helper) POST -> 404, expected 201 (`:86`).

The two cross-user tests (edit/delete another user's category) whose GREEN target is itself `404`
cannot silently pass in RED: they fail earlier, at the owner's create step (`assert 201`), because
the create route is absent.

```
$ (repo root) python scripts/check-traceability
check-traceability: 24 claimed, 11 traced, 13 gap.
GAP - ... 13 slice-003 ids (FR-TIMER-*/FR-SESS-*/FR-NOTIF-01) ...
EXIT=1
```

Slice 002's own bar is met: FR-CAT-01/02/03 are no longer GAPs (traced count rose 8 -> 11). The
exit 1 and the 13 remaining gaps belong entirely to slice 003's pre-seeded, untracked specs
(recorded in `docs/agent-runs/002-categories-trace.md` STAGE 0e), not to this slice.

```
$ (repo root) python scripts/check-traceability --write
check-traceability: wrote docs/qa/traceability.md (24 claimed, 11 traced, 13 gap)
EXIT=0
```

Matrix rows now read `FR-CAT-01 | COVERED | 002 | ...3 tests`, `FR-CAT-02 | COVERED | 002 | ...3
tests`, `FR-CAT-03 | COVERED | 002 | ...4 tests` (`docs/qa/traceability.md:28-30`).

## Findings

- `[MINOR] backend/tests/test_categories.py` - delete tests assert the observable archive contract
  (`archived_at` set + exclusion from `GET`), not a physical row delete, per the ratified resolution
  of design Open question 1 (the `sessions` table arrives in slice 003). If the implementer chooses
  true hard-delete-when-empty later, `test_delete_category_with_no_sessions_removed_from_active_list`
  still holds (it asserts only gone-from-active-list), but `test_delete_archives_category` deliberately
  pins archive-on-delete for slice 002; revisit both when the sessions slice lands the empty-delete
  optimization.
- None BLOCKING.

## Verdict

**RED bar ready.** All 10 named acceptance checks for FR-CAT-01/02/03 are encoded, one behavior per
test, and fail for the right reason (`POST /api/categories` absent -> 404 vs. the asserted 201). Ruff
is clean; traceability shows FR-CAT-01/02/03 COVERED and attributed to the 10 tests. No product code
was written or edited.

## What was NOT done / follow-ups

- **Wrote no product code** and edited nothing under `backend/app/`, `backend/alembic/`, `frontend/`,
  `backend/tests/conftest.py`, or `backend/tests/test_auth.py`. The RED is genuine, not a stub.
- **Did not commit.** The RED bar and the regenerated `docs/qa/traceability.md` are left in the
  working tree for the `/run-slice` orchestrator to commit (the pre-commit hook self-stages the
  matrix).
- **Deliberately out of scope** (no tests, per the ratified scenarios): unarchive, physical
  hard-delete of a row, per-card stats, the live-sync `changes_cursor` bump, and server-side hex-color
  format validation (design Open question 5, unresolved).
- **Did not run** the full `scripts/verify.*` / `gate-slice` battery (mypy/alembic/frontend) - out of
  scope for a test-first RED author and expected to fail while the router is absent; the implementer
  runs the full gate on the way to green.
