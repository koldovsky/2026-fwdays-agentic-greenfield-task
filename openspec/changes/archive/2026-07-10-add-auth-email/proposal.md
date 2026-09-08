## Why

Cadence stores per-user time-tracking data, so every later capability (timer, sessions, categories,
metrics, coach, extension) sits behind an authenticated, per-user boundary. Slice 001 built that
foundation: email + password accounts, server-side session cookies, the current-user dependency, and
the per-user-scoped repository pattern all later data access relies on.

This change is recorded **retroactively**: the code was implemented and verified against
[`docs/specs/001-auth-email.md`](../../../docs/specs/001-auth-email.md) (ratified) before OpenSpec
was adopted. It documents what was actually built so the OpenSpec contract reflects reality; it is
not a new proposal for unbuilt work.

## What Changes

- Add email + password registration (`POST /api/auth/register`) with case-insensitive (CITEXT) unique email. **FR-AUTH-01**
- Add login (`POST /api/auth/login`): verify credentials, insert a server-side `user_sessions` row, set the session cookie, issue a CSRF token. **FR-AUTH-02**
- Add logout (`POST /api/auth/logout`): delete the session row and clear the cookie. **FR-AUTH-03**
- Add the protected `GET /api/auth/me` and the `CurrentUser` auth dependency; unauthenticated requests get `401`. **FR-AUTH-06**
- Establish per-user data isolation and the user_id-scoped repository pattern. **FR-AUTH-07**, **NFR-SEC-03**
- Hash passwords with bcrypt cost 12; session cookie `HttpOnly; SameSite=None; Path=/` with env-driven `Secure`; CSRF double-submit required on mutations. **NFR-SEC-01**, **NFR-SEC-02**
- Out of scope (not in this change): OAuth sign-in FR-AUTH-04/05 and the `oauth_identities` table (slice 009); password reset / email verification (decision A-5).

## Capabilities

### New Capabilities
- `auth`: email + password accounts, server-side session cookies, the current-user dependency, CSRF protection, and per-user data isolation.

### Modified Capabilities
<!-- None: auth is the first capability recorded in OpenSpec. -->

## Impact

- **Requirements** (authoritative text in [`docs/requirements.md`](../../../docs/requirements.md)): FR-AUTH-01, FR-AUTH-02, FR-AUTH-03, FR-AUTH-06, FR-AUTH-07, NFR-SEC-01, NFR-SEC-02, NFR-SEC-03.
- **Backend:** `users` + `user_sessions` tables (Alembic `0001_auth_email`, citext enabled); `app/api/auth.py`, `app/api/deps.py`, `app/services/auth.py`, `app/repos/`, `app/core/security.py`, `app/config.py`.
- **Frontend:** auth screen `src/pages/AuthPage.tsx`; CSRF handling in `src/api.ts`.
- **Tests:** `backend/tests/test_auth.py` (8 acceptance tests + password-hash check), against real Postgres.
- **Docs:** `docs/specs/001-auth-email.md` is retained as the Python-traceability-harness anchor and links to this change (see the specs<->traceability bridge decision in `openspec/README.md`).
