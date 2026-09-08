# 006 - 002-categories - security-review

> The `security-reviewer` sub-agent is hard read-only and returned its findings inline; the
> orchestrator persisted this record verbatim from that return.

## Run

- **Date:** 2026-07-10 (Europe/Kyiv)
- **Slice:** 002-categories
- **Role:** security-review, independent fresh context
- **Branch:** feat/002-categories
- **Commits:** (none — read-only)

## Objective

Independent security review of slice 002 (categories CRUD), diff `5a8a3b8..HEAD`
(commits ec0c30d RED, 3db7600 GREEN): secrets, per-user isolation (FR-AUTH-07),
CSRF (NFR-SEC-02), authN boundary, and injection/input.

## What was done

- Read-only inspection of the backend slice-002 surface: api/repos/services/schemas/
  model/migration for categories, plus main.py + models/__init__.py entry-point appends.
- Confirmed per-user isolation: repos/categories.py get() scopes by (id, user_id);
  update()/archive() route through it, so cross-user id -> None -> 404 (never 403/leak).
  Ownership set from CurrentUser (user.id), never client-supplied.
- Confirmed CSRF: categories.py:26/55/78 mutating routes carry Depends(require_csrf)
  (:30/58/81); GET (:48) does not. All 4 routes behind CurrentUser.
- Confirmed injection safety: repo uses select() constructs (execute at :45,:54 only);
  migration/model postgresql_where=text("archived_at IS NULL") is static; test text()
  uses bound params. Pydantic bounds name<=100/color<=32/desc<=500, non-empty name/color.
- Confirmed no scattered os.environ (grep: no matches); config via app/config.py.
- Checked frontend color sink (CSSOM style object, no dangerouslySetInnerHTML) and
  api.ts categories calls riding apiFetch (credentials + CSRF).

## Verification

```
$ python scripts/check-secrets
EXIT=0   # default staged scan = no-op (slice 002 already committed, nothing staged)

$ files=$(git diff 5a8a3b8..HEAD --name-only --diff-filter=ACM) && python scripts/check-secrets $files
EXIT=0   # explicit scan of all 26 slice-002 files: clean

$ grep os.environ / getenv in backend/app  -> No matches found
```

Not run (orchestrator constraint, avoid DB flake): pytest, scripts/gate-slice.

## Findings

- `[MINOR] backend/app/schemas/categories.py:28` — color accepted as any non-empty
  <=32-char string, no server-side hex validation; rendered into React inline style
  (CategoriesPage.tsx:124,184). Not an exposure (CSSOM single-property assignment,
  bounded, per-user self-data); defense-in-depth. Remediation: enforce
  `^#[0-9A-Fa-f]{6}$` once design Open question 5 is resolved.
- No BLOCKING findings.

## Verdict

PASS-with-minors (up to the orchestrator; only the Judge marks done). 0 BLOCKING,
1 MINOR. Per-user isolation, CSRF, authN, injection, and secrets bars all met.

## What was NOT done / follow-ups

- Did not run pytest/gate-slice (per constraint; GREEN already verified serially).
- Did not create this run-record file directly — read-only role hard boundary; content
  returned inline to the orchestrator to persist.
- Slice-001 inherited controls (session_secret/cookie_secure dev defaults, double-submit
  design) were treated as out of scope and only checked for correct reuse, not re-audited.
