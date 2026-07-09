# Fix GDPR account endpoints

## Why

The two GDPR self-serve endpoints — `DELETE /api/account` (permanent delete) and
`GET /api/account/export` (data export) — each wrapped no error handling around
their downstream calls (`getDb()`, `getCvEncryptionKey()`, service assembly). Any
throw (an unset `CV_ENCRYPTION_KEY`, a DB/FK error, a key failure) propagated
uncaught, so Next surfaced an opaque raw 500. This is the confirmed root cause of
the two reported bugs: "delete profile not working" and the "Завантажте копію
своїх даних" export returning 500. It breaks NFR-GDPR-01 (export right),
NFR-GDPR-02 (delete right), and NFR-OBS-01 (calm failure, never a raw 500), and an
unguarded error can leak a stack or schema detail to the caller (information
disclosure).

The `account` capability (GDPR export + delete) exists in code but was never
captured in a baseline spec. This change fixes the endpoints and specs the
capability so its error contract is testable and traceable.

## What Changes

- Both routes wrap their downstream calls in try/catch and return a calm coded
  500 (`{ error: "deletion_failed" }` / `{ error: "export_failed" }`) instead of
  an uncaught raw 500 (NFR-OBS-01).
- The error cause is logged server-side only, with no user ID, CV text, or key
  material in the log line (NFR-SEC-01/02), and no stack/schema detail in the
  response body (information disclosure).
- Existing behavior is unchanged: 401 for anonymous callers, 404 when the user
  row is gone, session cookies cleared on successful delete, JSON attachment on
  successful export.
- Route-level tests cover anonymous / success / failure paths with a no-leak
  assertion on the error body.
- Confirmed while fixing: every child table references its owner
  `ON DELETE CASCADE`, so delete propagation (NFR-GDPR-02) is sound.

## Capabilities

### New Capabilities

- `account`: GDPR self-serve data export and permanent account deletion, with a
  calm coded-error contract that never leaks internals.

### Modified Capabilities

_None._

## Impact

- Code: `src/app/api/account/route.ts`, `src/app/api/account/export/route.ts`
  (already shipped in commit `c39fc9f`), plus new tests
  `src/app/api/account/route.test.ts`, `src/app/api/account/export/route.test.ts`.
- Specs: adds the `account` baseline capability.
- No schema change, no client change, no new dependency.
