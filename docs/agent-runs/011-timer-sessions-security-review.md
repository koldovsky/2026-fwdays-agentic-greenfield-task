# 011 — timer-sessions — security-review

## Run

- **Date:** 2026-07-11 00:05 (Europe/Kyiv)
- **Slice:** 003-timer-sessions
- **Role:** security-review (independent, read-only, fresh isolated context — did not author the code)
- **Branch:** feat/003-timer-sessions
- **Commits:** (none — read-only)

## Objective

Independent security review of `git diff ee63e98..HEAD`: secrets, per-user isolation, the undo token,
CSRF, auth-boundary reuse, and injection/XSS sinks — without running the shared-DB suite (concurrent
code review).

## What was done

Ran `check-secrets` on the changed files; audited the three new repos + services for `user_id`
scoping; verified the undo token generation/storage/consumption; confirmed CSRF on every mutation;
confirmed the slice-001 auth boundary is untouched; grepped for raw SQL / `os.environ` / XSS sinks.

## Verification

```
$ python scripts/check-secrets <49 changed files>   -> EXIT 0 (clean; only the fake test password,
                                                        skipped by the test-path rule)
$ grep dangerouslySetInnerHTML|innerHTML|eval (fe)   -> none
$ grep os.environ (app)                              -> none (only pre-existing scripts/_harness.py)
(Did NOT run pytest/gate-slice/verify — shared DB + concurrent reviewer.)
```

## Findings

- `[MINOR] backend/app/schemas/sessions.py:81,95` — the manual-add / edit `pauses` list has no length
  bound; an authenticated (CSRF-gated, per-user) request could insert a very large number of
  `pause_segments` in one transaction. Self-scoped resource use, not anonymous abuse. Fix:
  `Field(default_factory=list, max_length=<N>)`.
- `[MINOR] backend/app/api/undo.py:18` — the undo secret travels in the URL path, where proxy/access
  logs and referrers can capture it. Cross-user abuse is already neutralized (`get_consumable` requires
  `user_id == caller`; single-use; 10 s TTL), so residual risk is same-user log noise. Prefer the body/
  header if access-log hygiene matters.
- Robustness note (deferred, flagged for the code-reviewer): undo `_restore_deleted`/`_restore_discarded`
  re-insert using the before-image `category_id` without re-checking the category exists — not a
  cross-user issue (id from the user's own image, `user_id` forced to caller); moot under slice-002
  archive-not-delete (the FK stays valid), so no `IntegrityError` path in practice.

Verified clean (no BLOCKING): per-user isolation on `active_sessions.py` / `sessions.py` / `undo.py`
with `category_id` re-validated against the caller's own categories; cross-user→404; undo token
`secrets.token_urlsafe(32)` + `UNIQUE` + single-use (`consumed_at`) + expiry + user-scoped
(`undo_support.py:30-32`, `undo_entry.py:36`, `undo.py:44-64`); `require_csrf` on all 9 mutations, GET
exempt; `CurrentUser` on all routes; `config/security/deps/auth/user` untouched; no string-built SQL;
JSONB round-trips via ISO strings; frontend rides `apiFetch` with credentials + `X-CSRF-Token`.

## Verdict

**PASS** — 0 BLOCKING, 2 MINOR (optional hardening).

## What was NOT done / follow-ups

Did not run the DB test suite (per instructions). Both minors are optional; the bounded `pauses`
length is the higher-value one. Undo-restore category-existence robustness flagged for the
code-reviewer/Judge.
