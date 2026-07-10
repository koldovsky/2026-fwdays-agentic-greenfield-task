# Proposal: house-directory

## Why

Slice **S-03 «Довідник будинків»** (docs/mvp-capability-plan.md, Е-3): tickets
(S-04) must be attached to a house from the user's own directory, so the
directory has to exist first. This is also the first real domain CRUD, where
the cross-cutting owner-isolation rules (FR-ACCESS-01, NFR-SEC-03) are
introduced and become the pattern every later slice follows.

## What Changes

- New `house` table (Prisma migration): owner-scoped house records with a
  required name/address and an optional note (FR-HOUSE-01).
- New REST CRUD endpoints for houses under the existing session guard:
  list / create / get / update / delete, every operation scoped to the
  session owner; a foreign or missing house answers in 404 style with no
  "not yours" vs "not found" distinction (FR-ACCESS-01, NFR-SEC-03).
- Delete is refused with an understandable error when the house has at least
  one ticket attached (FR-HOUSE-02). No `ticket` table exists until S-04, so
  in this slice the check is introduced as the invariant plus its test
  surface; it becomes observable end-to-end in S-04.
- New SPA screen «Будинки»: list of the user's houses with create, edit
  (name/address + note), and delete, in Ukrainian, following ADR-0009
  conventions (zoneless + OnPush, signals + facade).
- `/login` now redirects an already-authenticated user to the home page
  (low finding of the S-02 review, accepted 2026-07-08, plan v1.6).

## Capabilities

### New Capabilities

- `house-directory`: owner-scoped houses directory — CRUD API and SPA screen,
  owner isolation with 404-style answers for foreign/missing objects, and the
  "no delete while tickets exist" invariant (FR-HOUSE-01/02, FR-ACCESS-01,
  NFR-SEC-03).

### Modified Capabilities

- `otp-auth`: the login screen requirement gains a redirect — an
  authenticated user opening `/login` is sent to the home page instead of
  seeing the phone/code form.

## Impact

- **DB:** new Prisma model `house` (+ migration); FK from `ticket` arrives in
  S-04.
- **API:** new `houses` module (controller/service/DTOs) behind the global
  `SessionGuard`; 404-style owner checks set the precedent for S-04+.
- **Web:** new route `/houses` (guarded), houses facade + container/
  presentational components; `/login` route gains the authenticated-redirect
  guard.
- **Tests:** api unit + api-e2e for CRUD/isolation/delete-invariant;
  Playwright e2e for the directory happy path and the login redirect.
- **Docs:** traceability-matrix rows for FR-HOUSE-01/02, FR-ACCESS-01,
  NFR-SEC-03; current-state update at slice end.

## Non-goals

- Tickets and the house→ticket FK behavior end-to-end (S-04; only the
  invariant's contract is fixed here).
- Import/synchronization of the directory (plan S-03 non-goal).
- Any sharing between users, roles, or admin views — the workspace stays
  strictly personal.
- Pagination/search in the directory: a personal directory is expected to be
  small (BC-PRIN-01); the list renders in full.
