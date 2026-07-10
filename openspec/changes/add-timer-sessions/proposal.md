## Why

Cadence is a timer. Everything downstream — the heatmap, the metrics engine, and the coach — reads
the sessions a user records; nothing can be built on top until a user can actually run a timer, save
the result, and correct it afterwards. This change adds that core loop: the live active timer
(start / pause / continue / stop+save / discard), the saved-session log with manual add / edit /
delete, and the 5-second undo that makes every destructive action reversible. It builds directly on
the slice 001 authentication boundary (a session is strictly per-user) and the slice 002 categories
capability (a session references a category), reusing both rather than re-implementing them.

Authored **before any code** (spec-first, per [`openspec/README.md`](../../README.md)): this is the
ratified contract the implementation will be built against. It follows architecture §2.1 (the
`sessions`, `pause_segments`, `active_sessions`, `undo_entries` tables), §2.2 (net vs gross), §6 (the
undo mechanism), and DESIGN §7.2 / §7.3 / §8 (the Timer screen, session log, and undo notification).

## What Changes

- Start the active timer (`POST /api/timer/start`): create the single active session for a
  user-selected category and count elapsed time up from zero. **FR-TIMER-01**
- Pause and continue (`POST /api/timer/pause` · `/continue`): pausing opens a pause segment on the
  active session; continuing closes it. Paused spans are excluded from net time. **FR-TIMER-02**
- Stop and save (`POST /api/timer/stop`): a save modal captures optional notes and a final category;
  the active session is persisted **atomically** as a `sessions` row plus its `pause_segments`, and
  the `active_sessions` row is cleared. **FR-TIMER-03**, **FR-SESS-01**
- Discard with confirmation (`POST /api/timer/discard`): after an explicit confirmation prompt, the
  active session is dropped **without persisting anything** (no session, and therefore no future
  metric or heatmap effect); the discard is surfaced by the undo notification. **FR-TIMER-04**
- Keyboard shortcuts on the Timer screen: Space starts/pauses, S stops and saves, Esc triggers the
  discard confirmation (A-8, DESIGN §7.2). **FR-TIMER-05**
- A single **server-authoritative** active (running or paused) session per user: there is never more
  than one, it is shared across the user's devices, and starting a new one is rejected until the
  current one is stopped or discarded. **FR-TIMER-06**
- Every saved session exposes both a **gross** and a **net** duration, derived (never stored) per
  architecture §2.2. **FR-SESS-02**
- The saved-session log (`GET /api/sessions`): list the user's saved sessions. **FR-SESS-06**
- Manual add (`POST /api/sessions`): record a past session with start, end, category, optional notes,
  and optional pause segments, each pause entered with its own start/end via an add-pause control
  (A-6). **FR-SESS-03**
- Edit (`PATCH /api/sessions/{id}`): change a session's start, end, category, notes, and pause
  segments (add / adjust / remove a pause); surfaced by the undo notification. **FR-SESS-04**
- Delete (`DELETE /api/sessions/{id}`): remove a session (its pause segments cascade); surfaced by
  the undo notification. **FR-SESS-05**
- The undo notification (`POST /api/undo/{token}`): a 5-second bottom-left Undo after a discard,
  edit, or delete, implemented as an immediate server write plus a compensating restore from a
  before-image, with a single-use token (architecture §6). Undo-of-delete restores the row,
  undo-of-edit restores prior values, and undo-of-discard restores the unsaved active-timer state.
  **FR-NOTIF-01**
- Reuse — do not re-implement — the slice 001 `CurrentUser` dependency and user_id-scoped repository
  pattern (per-user isolation, **FR-AUTH-07**) and the slice 002 `categories` capability (the
  `category_id` foreign key).

## Capabilities

### New Capabilities
- `timer-sessions`: the active timer (start / pause / continue / stop+save / discard), the saved
  session store with derived net/gross durations and discrete pause segments, manual add / edit /
  delete, and the 5-second undo for discard / edit / delete. This one slice-level capability bundles
  the `timer`, `sessions`, and `notifications` requirement groups of
  [`docs/requirements.md`](../../../docs/requirements.md), which are delivered together as one
  vertical slice.

### Modified Capabilities
<!-- None. `timer-sessions` is a new capability. It reuses the `auth` capability (CurrentUser +
     user_id-scoped repos, FR-AUTH-07) and the `categories` capability (category_id FK) without
     modifying either. -->

## Impact

- **Requirements** (authoritative text in [`docs/requirements.md`](../../../docs/requirements.md)):
  FR-TIMER-01..06, FR-SESS-01..06, FR-NOTIF-01; reuses FR-AUTH-07 (per-user isolation) and the slice
  002 categories capability (FR-CAT-01..03) as the `category_id` reference.
- **Endpoints** (architecture §10), all behind `CurrentUser`:
  `POST /api/timer/{start,pause,continue,stop,discard}`;
  `GET`/`POST`/`PATCH`/`DELETE` `/api/sessions[/{id}]`; `POST /api/undo/{token}`.
- **Backend / migration:** one Alembic migration `0003_timer_sessions` creating four tables per
  architecture §2.1 — `sessions` (`user_id` FK, `category_id` FK, `started_at`, `ended_at`, `notes`
  nullable, `source` `timer|manual`, CHECK `ended_at > started_at`, INDEX `(user_id, started_at)`);
  `pause_segments` (`session_id` FK `ON DELETE CASCADE`, `paused_at`, `resumed_at`, CHECK
  `resumed_at > paused_at`, CHECK the pause lies within its session); `active_sessions` (`user_id` FK
  **UNIQUE** — the single-active constraint — `category_id` FK, `started_at`, `state`
  `running|paused`, `pause_started_at` nullable, `accumulated_pauses` JSONB, `version` for optimistic
  concurrency); and `undo_entries` (`user_id` FK, `action` `discard|edit|delete`, `before_image`
  JSONB, `expires_at`, `consumed_at`). New user_id-scoped repositories, a timer/sessions/undo service
  layer, a pure net/gross derivation in `app/core`, and the `app/api` routers with their Pydantic
  models. The autogenerated SQL is hand-reviewed (partial/CHECK constraints and JSONB defaults need a
  manual touch-up), per AGENTS.md.
- **Frontend:** the Timer screen (DESIGN §7.2) — the state-driven timer card (idle / running /
  paused), the category pill, the big mono timer, Pause/Continue/Stop/Discard controls, the
  discard-confirm dialog, the save modal (notes + final category), and the Space/S/Esc shortcuts; and
  the session log (DESIGN §7.3) — the list of saved sessions with manual add / edit / delete forms
  carrying an add-pause control, plus the bottom-left undo notification (DESIGN §8). All HTTP through
  `src/api.ts`; SVG icons only, no emoji (NFR-DES-01).
- **Tests:** `backend/tests/test_timer.py`, `test_sessions.py`, and `test_undo.py` against real
  Postgres, plus a pure `app/core` duration unit test, each acceptance test carrying an
  `@trace <FR-ID>` docstring so `check-traceability` goes GAP -> COVERED.
- **Docs:** the thin anchor [`docs/specs/003-timer-sessions.md`](../../../docs/specs/003-timer-sessions.md)
  links to this change for the Python traceability harness (specs<->OpenSpec bridge,
  [`openspec/README.md`](../../README.md)).

## Out of scope

Belongs to later slices; this change must not implement it.

- **Metrics** (M1-M6, FR-METR-*) and **day attribution / midnight splitting** (architecture §3.7):
  metrics *consume* saved sessions — slice 004. This slice stores timestamps in UTC faithfully and
  computes no attribution, deep-block, or aggregate here.
- **Live-sync transport** — the 5-second `GET /api/sync/state` poll and cross-device propagation
  (architecture §5, NFR-DATA-01) — slice 007. This slice models the single-active **server state**
  (the `active_sessions` row and its `version` column) but not the polling loop that broadcasts it.
- **Stats page and charts** (FR-STATS-*) — slice 005; **heatmap** (FR-HEAT-*) — its own slice.
- **The browser extension** (FR-EXT-*, TC-EXT-01) — slice 008. The API is designed to be the single
  authority both clients share, but only the web client ships here.
- **Undo for stop+save:** architecture G-1 records that FR-NOTIF-01 intentionally does not cover
  save (a mis-saved session is recoverable via edit/delete). No save-undo is designed.
