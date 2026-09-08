# Follow-up: metrics-snapshot-extension (small slice-004 patch)

- **Status:** proposed follow-up (not scheduled; non-blocking for slice 005)
- **Date:** 2026-07-11
- **Owner:** (you)

## Why this exists

Slice 004 (`feat/004-metrics`) shipped the **original** architecture §4.1 snapshot plus a few
pragmatic code additions (`volume.all_time_min`, `top_categories[].{id,color}`, a separate
`per_category_per_day` block). It did **not** implement three extension fields nor the timezone
capture that the extended contract (and DESIGN) call for. Slice 005 (Stats UI) was reconciled to
render the **shipped** shape and degrades gracefully without these; this follow-up restores full
DESIGN coverage. None of it blocks slice 005 — it is a later, self-contained patch.

Verified against the shipped code: `backend/app/schemas/stats.py` (`SnapshotResponse`) and
`backend/app/core/snapshot.py` on `feat/004-metrics` (tip `6a1c799`).

## What to add (each is a small, isolated change)

1. **`baselines.streak` (M5 zoned score card).** The shipped `baselines` block carries only
   `volume`, `consistency`, `focus_share`, `switch_load`. Add a fifth `streak` entry
   (`{value, delta, zone}`) computed like the others (M5 `current_streak` baseline over the trailing
   30 days ending yesterday, §3.6). **Enables:** the Stats-UI M5 score card to render zoned instead
   of as a plain value (FR-STATS-05 / DESIGN §7.3 "card per M1-M5").

2. **`history_days` (building-chip day count).** Add a top-level `history_days` int = calendar days
   (user TZ) from the first saved session through today (`0` with no sessions). **Enables:** the
   Stats-UI "building — day N of 30" copy (§3.8); without it the chip is generic "building".

3. **`top_categories[].archived` (donut greying).** Add an `archived` bool to each `top_categories`
   entry (and confirm the stats service includes archived categories that have current-week time,
   rather than dropping them via an active-only category query). **Enables:** the Stats-UI donut to
   grey archived categories with an "(archived)" suffix (architecture §7).

4. **`PUT /api/me/timezone` + frontend sync (the real prod bug — highest value).** Slice 004's code
   has **no** timezone-capture route (`app/api/` has none), so every user stays `users.timezone =
   'UTC'` and the entire day-attribution machinery (FR-METR-07, §3.7) is correct in tests but
   **inert in production**. Add `PUT /api/me/timezone` (behind `CurrentUser` + CSRF, IANA-validated,
   `422` on unknown, updates only the caller's row) and a frontend sync that sends
   `Intl.DateTimeFormat().resolvedOptions().timeZone` on authenticated app load. Owned here per the
   slice-001 ratified resolution ("defer capture to the metrics slice"). Traces **FR-METR-07**.

5. **Bound pause-count at session creation (defense-in-depth, from the slice-004 iteration-4
   security review).** The iteration-4 fix added a load-time pause-count cap (`_MAX_SESSION_PAUSE_SEGMENTS
   = 1000` in `backend/app/services/stats.py`) that neutralizes the CPU (sort) vector. But
   `sessions.pauses` is `lazy="selectin"`, so an over-cap session's pause rows are still hydrated from
   the DB into memory **before** the cap skips it — a weaker memory/IO vector that survives on every
   snapshot/heatmap/session-log read. Real fix: cap pause count in slice-003's `backend/app/schemas/
   sessions.py` at creation (so the row can never be persisted), or exclude over-cap sessions at the
   SQL level so their pauses are never loaded. **Cross-slice (slice 003), not slice 004's to fix.**

## Notes

- Items 1-3 are pure additions to `app/core/snapshot.py` + `app/schemas/stats.py` (widen the
  response model); no migration. Item 4 adds one route + one frontend append (no schema — the
  `users.timezone` column already exists from slice 001).
- When scheduled, this becomes a normal ratified OpenSpec change (`extend-metrics-snapshot`) run
  through `/run-slice`. Until then slice 005 renders the shipped shape and stays green.
