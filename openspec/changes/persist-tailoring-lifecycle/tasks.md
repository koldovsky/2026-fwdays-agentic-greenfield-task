# Tasks — persist-tailoring-lifecycle

## 1. Schema migration

- [x] 1.1 Author `src/shared/lib/db/migrations/0005_tailoring_lifecycle.sql`:
  `ALTER TABLE tailorings ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed'))`;
  then `UPDATE tailorings SET status = 'complete'` to back-fill existing rows.
  Confirm the migration is additive (no column removed, no NOT NULL without
  DEFAULT) and runs cleanly on an empty database.
- [x] 1.2 Add `0005` to the migration runner list (wherever `0004` is registered)
  so `yarn db:migrate` applies it.
- [x] 1.3 Extend the pglite integration test in
  `src/shared/lib/db/persistence.integration.test.ts` to run `0005` and assert:
  (a) a pre-existing row keeps `status = 'complete'` after migration; (b) a newly
  inserted row without an explicit status defaults to `'pending'`; (c) an INSERT
  with an unknown status value throws a constraint violation.

## 2. Repository: createPending + updateStatus

- [x] 2.1 Add `createPending(userId: string, jobDescriptionId: string, jobTitle: string | null): Promise<string>` to `createTailoringRepo` in `src/shared/lib/db/tailoring-repo.ts`.
  Inserts a row with `status = 'pending'`, `match_score = NULL`, no checklist/bullet
  children, returns the new UUID. Depends only on `Queryable` (TC-PURE-01).
- [x] 2.2 Add `updateStatus(id: string, status: 'complete' | 'failed', payload?: CompletePayload): Promise<void>` to `createTailoringRepo`.
  When `status = 'complete'` and `payload` is supplied: UPDATE status, then INSERT
  checklist items and bullets — all within the caller-provided transaction (Queryable
  port is already transaction-agnostic). When `status = 'failed'`: UPDATE status
  only. When `payload` is absent on a `'complete'` call: UPDATE status only (safe
  partial completion for runs that produce no children).
- [x] 2.3 Refactor `save` to delegate: call `createPending`, then `updateStatus('complete', payload)`,
  returning a `TailoringRecord`. No behavior change; existing call sites keep working.
- [x] 2.4 Export `createPending`, `updateStatus`, and `CompletePayload` types from
  `src/shared/lib/db/index.ts` alongside the existing exports.
- [x] 2.5 Unit tests for the new repo methods (extend
  `src/shared/lib/db/persistence.integration.test.ts` or add a focused unit file):
  `createPending` returns a UUID; `updateStatus('complete', payload)` upserts
  children; `updateStatus('failed')` sets status only; `save` round-trips correctly;
  cross-user `findById` still returns null for non-owner.

## 3. TTL cleanup utility

- [x] 3.1 Author `src/shared/lib/db/tailoring-cleanup.ts` exporting
  `markAbandonedPending(db: Queryable, olderThanMs: number): Promise<number>`.
  Issues `UPDATE tailorings SET status = 'failed' WHERE status = 'pending' AND created_at < $1`
  and returns the count of rows updated. Framework-free (TC-PURE-01), safe to call
  concurrently (UPDATE WHERE is idempotent).
- [x] 3.2 Export `markAbandonedPending` from `src/shared/lib/db/index.ts`.
- [x] 3.3 Unit tests for `markAbandonedPending`: rows older than the TTL are marked
  `failed`; rows newer than the TTL are not touched; already-`failed` rows are
  unaffected (idempotent); returns the correct count.

## 4. Usage-counter timing shift (free logged-in users)

- [x] 4.1 In `src/app/api/tailor/route.ts`: move the free-user `counters.reserve` call
  to immediately before `createPending` (before any LLM work). Narrow
  `releaseReservation` to fire only on pre-LLM clean failures (validation,
  job-description insert error). Remove the release on LLM-abort / missing result —
  those are mid-run abandons that consume the slot.
- [x] 4.2 Apply the same timing shift in `src/app/api/tailor/generate/route.ts`.
- [x] 4.3 Route tests: free user blocked before LLM call if counter exhausted;
  pre-LLM validation failure releases the reservation; mid-run abort does not
  release it; paid user is never gated.

## 5. Persist-on-start wiring (both routes, all logged-in users)

- [x] 5.1 In `src/app/api/tailor/route.ts`: after auth + job-description save, call
  `createPending(userId, jdId, extractedJobTitle)` in a best-effort try/catch —
  log failure, continue run with `pendingId = null`. Store `pendingId` in the stream
  closure.
- [x] 5.2 In the same route: on terminal `result` event call
  `updateStatus(pendingId, 'complete', payload)` (best-effort try/catch, log only);
  on unrecoverable error path call `updateStatus(pendingId, 'failed')` (best-effort).
  Remove the paid-only guard — both calls apply for all logged-in users.
- [x] 5.3 Apply the same wiring to `src/app/api/tailor/generate/route.ts`: replace
  the existing post-completion `persistTailoring` call (paid-only) with
  `createPending` at start + `updateStatus` on result/failure.
- [x] 5.4 Route tests (both routes): logged-in free user — `createPending` called,
  `updateStatus('complete')` called on result, `updateStatus('failed')` called on
  error; a throwing `createPending` does not abort the stream; a throwing
  `updateStatus` after the result does not affect the client response.

## 6. Read routes: drop paid gate

- [x] 6.1 In `GET /api/tailoring` (`src/app/api/tailoring/route.ts` or equivalent):
  remove the paid entitlement check; keep the authentication check (anonymous
  callers still get 401). Add a `WHERE status = 'complete'` filter to `listByUser`
  (or filter in the route handler if the repo does not expose the filter directly).
- [x] 6.2 In `GET /api/tailoring/[id]`: remove the paid gate; keep IDOR guard
  (`record.userId !== currentUserId` returns 404, not 403) (NFR-SEC-02).
- [x] 6.3 Route tests: free logged-in user gets 200 on list and detail; anonymous
  gets 401; IDOR still returns 404; pending/failed rows absent from list.

## 7. i18n

- [x] 7.1 Add `tailoringStatus` i18n keys to `shared/lib/i18n` types + `ua.ts` +
  `en.ts` for any status labels rendered in the history view
  (`pending`, `complete`, `failed` display strings), Ukrainian-first (NFR-I18N-01).
  No emoji, no exclamation points (BC-BRAND-01).

## 8. Verify

- [x] 8.1 `yarn lint` — zero warnings or errors.
- [x] 8.2 `yarn build` — clean compile, no type errors.
- [x] 8.3 `yarn test` — all existing tests green plus the new tests from tasks
  1.3, 2.5, 3.3, 4.3, 5.4, 6.3.
- [ ] 8.4 Manual trace: start a tailoring as a free logged-in user in dev,
  confirm the pending row appears before the first token arrives; confirm it
  transitions to complete on result; confirm a second attempt is blocked with
  `rate_limited` before any LLM call.

## 9. Independent review

- [x] 9.1 checker subagent (maker != checker): review the diff for IDOR correctness
  (cross-user 404 not 403), counter-timing correctness (reserve before LLM),
  best-effort wiring (persistence never blocks result), migration back-fill safety,
  FSD boundary compliance, and NFR-OBS-01 (no PII in pending row, no silent
  swallowed errors without a log). Report all findings with severity before
  sign-off.
- [ ] 9.2 `openspec validate persist-tailoring-lifecycle` and archive once green.
