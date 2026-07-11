## Context

`timer-sessions` is the core loop of Cadence and the third capability, after the auth boundary
(slice 001) and categories (slice 002). It is authored before any code against
[`docs/requirements.md`](../../../docs/requirements.md) (FR-TIMER-01..06, FR-SESS-01..06,
FR-NOTIF-01), architecture §2.1 (the `sessions`, `pause_segments`, `active_sessions`, `undo_entries`
tables), §2.2 (net vs gross), and §6 (undo), and DESIGN §7.2 / §7.3 / §8 (Timer screen, session log,
undo notification). Where architecture or DESIGN already decided something, this design follows it;
genuine gaps are listed under Open questions rather than invented here.

Everything downstream reads what this slice writes: the metrics engine (slice 004), stats and charts
(005), the heatmap, and the coach all *consume* saved sessions and their pause segments. The single
hardest obligation of this slice is therefore to **store session and pause data faithfully** — every
pause discrete, timestamps in UTC, net/gross derivable — without itself computing any metric.

## Goals / Non-Goals

**Goals:**
- The live active timer: start, pause, continue, stop+save, and confirmed discard, as the single
  server-authoritative active session per user.
- A saved-session store with discrete pause segments and derived (never stored) net/gross durations.
- Manual add / edit / delete of sessions, with edit and delete covering pause segments.
- A 5-second undo for discard / edit / delete via immediate-write + compensating restore.
- Reuse — never re-implement — the slice 001 `CurrentUser` + user_id-scoped repository pattern
  (FR-AUTH-07) and the slice 002 `categories` capability (`category_id` FK).

**Non-Goals:**
- Any metric, aggregate, deep-block judgement, streak, or day/midnight attribution (architecture
  §3.7) — slice 004 consumes these sessions.
- The live-sync transport: the 5-second `GET /api/sync/state` poll and cross-device push
  (architecture §5). This slice models the server state (the `active_sessions` row and its
  `version`) but not the loop that broadcasts it — slice 007.
- Stats/charts (005), heatmap, and the browser extension (008).
- Undo for stop+save (architecture G-1: intentionally not designed).

## Decisions

- **The active timer is its own `active_sessions` table (architecture §2.1), not a `sessions` row
  with a null `ended_at`.** The "at most one active session per user" rule of FR-TIMER-06 becomes the
  DB constraint `UNIQUE(user_id)` instead of application code; saved-session queries (the whole
  metrics slice) never have to filter out an unfinished row; and undo-of-discard has a clean home
  (re-insert the `active_sessions` row). A second `start` while one is active is a `409`, not a
  silent replace — FR-TIMER-06 requires stopping or discarding first.
- **Pause model: open span on the active row, discrete segments on the saved row.** While running,
  a pause is the single open interval `pause_started_at`; continue closes it into
  `accumulated_pauses` (JSONB list of pairs on the active row). On stop+save, each accumulated pair
  becomes one `pause_segments` row against the saved session. Pauses are **never merged**
  (FR-SESS-01) — two 5-minute pauses persist as two rows, so slice 004 can count two interruptions.
- **Net and gross are derived, never stored (architecture §2.2).** `gross = ended_at - started_at`;
  `net = gross - sum(pause segments)`. The derivation is a pure function in `app/core` (reused by the
  metrics slice) and the API exposes both per session. Editing a pause therefore cannot desynchronize
  a stored total — there is none.
- **Atomic stop+save.** The `sessions` row, its `pause_segments`, and the deletion of the
  `active_sessions` row happen in one transaction, so a saved session and its pauses are always
  consistent and the active slot is freed exactly when the save lands.
- **Undo = immediate server write + compensating restore (architecture §6), not delayed commit.**
  Discard / edit / delete each execute on the server immediately and write a full **before-image** to
  `undo_entries` (discard: the `active_sessions` row incl. `accumulated_pauses`; edit: the prior
  session + pause segments; delete: the removed rows). The response carries a single-use undo token;
  `POST /api/undo/{token}` within the token's **10-second** server validity restores the before-image
  (the UI shows **5 seconds**; the extra 5 s absorbs clock/network skew). Undo-of-discard re-inserts
  the active session and **fails with a `409` conflict** if the user has meanwhile started a new one
  (the single-active rule holds). After expiry or a first use, the token is dead and the action has
  committed. This keeps the server the single source of truth at every instant — critical once the
  sync slice makes changes propagate across devices immediately (the 5-second window is a UI
  affordance, not a consistency mechanism).
- **`source` distinguishes `timer` from `manual`.** Live stop+save writes `source = timer`; manual
  add writes `source = manual`. Manually entered pauses feed later metrics exactly like live pauses
  (A-6); the two are indistinguishable to the metrics slice by design.
- **Optimistic concurrency via `version` (architecture §2.1).** Every timer action carries the
  `version` it last saw; a stale version returns `409` and the client re-syncs. The column and the
  409 behavior live here (the endpoints exist here); the 5-second poll that keeps devices' versions
  fresh is slice 007.
- **HTTP contract.** `201` on start and on a persisted session (stop+save, manual add) · `200` on
  pause/continue, edit, and a successful undo · `204`/`200`+token on delete · `409` on a second
  active start, an invalid state transition, a stale version, or an un-discard conflict · `404` on a
  category or session the user does not own · `422` on invalid session/pause bounds. Cross-user
  access is `404` (existence is not revealed), following the slice 001 pattern.
- **Isolation by reuse (FR-AUTH-07).** Every new repository method (`ActiveSessionRepo`,
  `SessionRepo`, `UndoRepo`) takes `user_id` and scopes every query by it; `category_id` is validated
  against the caller's own categories. No new isolation mechanism is introduced.
- **Day attribution is deferred (architecture §3.7).** Sessions store `started_at`/`ended_at` in UTC
  (architecture §2). This slice performs **no** timezone conversion, midnight splitting, or
  day-active determination; that is read-time metrics work in slice 004. Storing UTC faithfully is
  exactly what lets slice 004 attribute correctly later.

## Risks / Trade-offs

- **`undo_entries` accumulates.** Immediate-write undo leaves a before-image per action; expired and
  consumed rows are dead weight. Acceptable at personal scale; a sweep/TTL cleanup is deferred (Open
  question 6). Restore correctness never depends on cleanup.
- **10 s server validity vs 5 s UI window.** A user could, in principle, undo in second 6-10 after the
  toast visually vanished (e.g. via a replayed request). This is intentional skew absorption per
  architecture §6, not a bug; the token is still single-use and still expires.
- **On-load hydration gap before the sync slice.** The Timer screen needs to read the current active
  session on load, but architecture folds that read into `GET /api/sync/state` (slice 007). Until
  then the screen has no defined hydration source (Open question 1).
- **Manual entries trust client-supplied timestamps.** Manual add/edit accept arbitrary past
  start/end/pause times bounded only by the CHECK constraints (`ended_at > started_at`, pause within
  session). Overlapping manual pauses or absurd ranges are the user's own data; no further validation
  is designed unless the owner wants it.

## Open questions

Surfaced for the owner to resolve at ratification; not silently resolved in a scenario.

1. **On-load active-session read before slice 007.** The Timer screen must hydrate the current active
   session when it loads, but architecture §5 provides that read only through `GET /api/sync/state`,
   which is the sync slice (007). Recommended (owner to confirm): slice 003 exposes a minimal
   read of the active session (the `active_session` subset of the future `/api/sync/state` payload),
   or the timer-action responses double as the hydration source, and the full poll lands in 007.
   Flagged rather than inventing a new endpoint beyond architecture §10.
2. **Stop while paused.** When the user stops a timer that is currently paused, architecture §2.1 says
   "write the session + segments" but does not say what happens to the still-open pause. Does the
   trailing open span become a final `pause_segments` row `[pause_started_at, ended_at]` (so net
   excludes it), or is `ended_at` clamped to `pause_started_at` (the session ends where active work
   stopped)? The happy-path scenarios deliberately stop a *running* timer to avoid pre-judging this.
3. **Discard confirmation is UI-only.** The confirmation of FR-TIMER-04 / A-8 is a client dialog
   (DESIGN §7.2); the `POST /api/timer/discard` endpoint carries no separate "confirmed" flag and
   trusts the call. Confirm the server need not re-encode the confirmation.
4. **No undo for stop+save (architecture G-1).** FR-NOTIF-01 covers discard/edit/delete but not save;
   a mis-saved session is corrected via edit/delete. Confirm this asymmetry is intended (already an
   open gap in architecture G-1).
5. **Referencing an archived category.** Architecture §7 hides archived categories from pickers but
   keeps them as valid FKs for history. May a `start` or a manual add reference an *archived* category
   server-side (allow, since it is a valid FK) or should the API reject a new reference to an archived
   category (since pickers should never offer one)? Not invented here.
6. **`undo_entries` housekeeping.** Confirm that pruning expired/consumed undo rows is out of scope
   for this slice (a later sweep), and that only correctness — never cleanup — is required now.
