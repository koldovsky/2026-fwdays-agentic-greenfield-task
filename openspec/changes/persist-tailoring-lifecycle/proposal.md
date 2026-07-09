# Persist tailoring lifecycle for all logged-in users

## Why

Two root-cause gaps make tailoring history unreliable and the free-tier cap
bypassable:

**Gap 1 — incomplete persistence.** `add-tailoring-history` wired
persistence only for paid users, only at completion, and only in the wizard
path (`/api/tailor/generate`). The one-shot path (`/api/tailor`) never
persists at all (route.ts:119-153). Any paid user who used the one-shot path
has no history. Any in-flight run that crashes between generation and
completion leaves no trace. If the server restarts mid-run, the row does not
exist. Free logged-in users also produce tailoring work that disappears on
refresh (FR-TAILOR-04 speaks to logged-in paid users, but the history read
path is already opened to all logged-in users in this project — the
classification decision is: persist for all logged-in users, then gate the
read view by entitlement). Implements FR-TAILOR-04, FR-HISTORY-01,
FR-HISTORY-02, NFR-OBS-01.

**Gap 2 — server-side free-tier cap not fully closed.** `add-security-hardening`
enforces `NFR-COST-02`'s lifetime budget by reserving budget atomically before
the LLM call. However, the reservation uses an in-memory sliding window for
anonymous callers and the durable `usage_counters` table for logged-in free
callers. The durable counter is incremented only after a successful run
(`COMPLETION`). A logged-in free caller who sees a pending row (started but
never completed, e.g. a browser-close mid-run) does not have that attempt
counted — so they could start runs they know will fail to probe the system.
Enforcing the cap also at `START` (pending row creation, counted as a reserved
slot) and releasing it only on a clean failure closes this window and aligns
the lifecycle with the durable audit trail. Implements FR-ONBOARD-01,
FR-PAYWALL-01, NFR-COST-02.

**User decision encoded here:** persist a `PENDING` tailoring row at generate
START for all logged-in users (not paid-only); UPDATE the same row on each
lifecycle step (`pending` to `complete` or `failed`); open the `/history` read
path to all logged-in users (entitlement-gated in the view). Enforce the 1
free-tailoring lifetime cap server-side via the durable `usage-counter` so
free users cannot re-run. Add a cleanup sweep for abandoned `pending` rows
beyond a TTL. Implement `createPending` and `updateStatus`/`complete` repo
methods alongside the existing `save`.

## What Changes

- **Migration `0005`.** Add a `status` column to `tailorings`
  (`pending | complete | failed`) with a `CHECK` constraint and a `NOT NULL
  DEFAULT 'pending'`. Existing rows (which were all completed saves) are
  back-filled to `complete`. Add `abandoned_at` (computed or stored TTL
  marker, see tasks) for cleanup queries. Additive, backward compatible.
- **Repo methods `createPending` + `updateStatus`.** `createPending(userId,
  jobDescriptionId, jobTitle)` inserts a `status = 'pending'` row and returns
  its `id`. `updateStatus(id, 'complete' | 'failed', payload?)` sets status
  and, for `complete`, upserts the checklist and bullet children
  (all-or-nothing in a transaction). The existing `save` becomes a thin wrapper
  over `createPending` + `updateStatus` for backward compatibility.
- **Persist at START, for all logged-in users.** Both generation routes
  (`/api/tailor` and `/api/tailor/generate`) call `createPending` immediately
  after authentication and job-description row creation, before the LLM call.
  This replaces the paid-only, post-completion write.
- **Update on result.** On a `result` event the route calls `updateStatus(id,
  'complete', payload)`. On any unrecoverable failure it calls `updateStatus(id,
  'failed')`. Both are best-effort: a persistence failure is logged server-side
  and MUST NOT alter the result the user already received (NFR-OBS-01).
- **Free-tier cap uses pending rows as reserved slots.** When a free logged-in
  user starts a run, the counter is incremented (reserved) before the LLM call.
  A clean failure (LLM error, parse failure) releases the reservation. A
  browser-close / abandoned `pending` row does not auto-release; it stays
  counted (closed loop with TTL cleanup below).
- **TTL cleanup for abandoned `pending` rows.** A server-side utility
  (callable as a cron or a one-off maintenance script) marks rows that have
  been `pending` beyond a configurable TTL (default 30 minutes) as `failed`.
  This prevents indefinite locks on free users' budgets from abandoned sessions.
- **History read path: all logged-in users.** The `GET /api/tailoring` list
  and `GET /api/tailoring/[id]` detail routes drop the paid gate and serve any
  authenticated user. The history view surfaces completed tailorings; pending
  and failed rows are filtered in the list (or shown with a status badge,
  per-view decision). The upgrade paywall remains at the export step
  (FR-PAYWALL-01), not at history access.

## Capabilities

### Added Capabilities

- `tailoring-history`: no baseline spec existed. This change adds the full
  specification: lifecycle-aware persistence (pending/complete/failed), repo
  contract (`createPending`, `updateStatus`), both generation routes persist for
  all logged-in users, history read open to all logged-in users, and TTL cleanup
  for abandoned runs.

### Modified Capabilities

- `paywall`: the free-tier cap (NFR-COST-02, FR-ONBOARD-01, FR-PAYWALL-01) is
  tightened. The usage counter is now incremented at run START (not only at
  completion) and is released only on clean failure — pending-row abandonment
  does not auto-release. Aligns the durable counter with the lifecycle audit
  trail so the cap cannot be probed by intentionally abandoned runs.

## Impact

- **Schema:** additive migration `0005` (`status` column + optional `abandoned_at`
  + `DEFAULT 'pending'` + back-fill of existing rows to `complete`).
- **Repo:** `shared/lib/db/tailoring-repo.ts` gains `createPending` +
  `updateStatus`; existing `save` wraps them.
- **Hot paths:** `/api/tailor/route.ts` and `/api/tailor/generate/route.ts`
  each gain a `createPending` call before the LLM and an `updateStatus` call
  after the terminal event. The paid-only guard on persistence is removed.
- **Usage-counter:** timing of `reserve`/`increment` for free logged-in users
  shifts to START; `release` is narrowed to clean failures only.
- **Read routes:** `GET /api/tailoring` + `GET /api/tailoring/[id]` — paid gate
  removed; IDOR guard (404 on cross-user) kept (NFR-SEC-02).
- **Cleanup:** new `shared/lib/db/tailoring-cleanup.ts` (or equivalent) exposing
  a `markAbandonedPending(olderThanMs)` pure function over a `Queryable`.
- **Privacy / GDPR:** `status` is non-PII metadata; existing FK cascade and
  GDPR export/delete service already cover `tailorings` rows (NFR-GDPR-01/02).
  No new PII category.
- **NFR-OBS-01:** persistence failure at START or COMPLETE must be observable
  server-side (logged) and must never break the client-facing result stream.
- **NFR-SEC-01:** no CV text or PII is written to the `pending` row; the row
  carries only the extracted job title (non-sensitive) and status.

## Open question

None. The user decisions (persist for all logged-in users, pending at start,
cap at start, TTL cleanup) are confirmed in the brief above. Implementation
proceeds as specified.
