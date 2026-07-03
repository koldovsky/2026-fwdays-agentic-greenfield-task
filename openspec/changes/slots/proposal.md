## Why

`slots` is Slice S1 of the signed Phase 3 plan (`docs/mvp-capability-plan.md`
§S1, G3 2026-07-04): the flagship pure-`lib/` capability, the richest
unit-test surface in the MVP, and the slice that resolves the highest-risk
unknown — the MCP-vs-googleapis Google Calendar adapter transport (TC-CAL-01,
ADR-0003 §6) — before any bot or dashboard code is built on top of an
unproven interface. It has no dependencies on the other four slices, so
starting here lets the calendar contract stabilize while `intake` (S2) is
still unbuilt. The baseline spec `openspec/specs/slots/spec.md` already
passed G2 (5/5 `openspec validate --all --strict`); this change implements
it, unchanged, against real code and a real DEMO calendar.

## What Changes

- New framework-free `lib/slots/` modules (TC-PURE-01): deterministic
  Mon–Fri 10:00–19:00-start grid generator (BC-SCHEDULE-01, FR-GUARD-03),
  half-open busy-interval subtraction, `rankSlots()` (fit → teacher
  compactness → earlier date, FR-SLOT-04), and the ordered widening
  algorithm (time → adjacent day → full grid, FR-SLOT-03).
- A single `CalendarPort` adapter interface (ADR-0003 §6) plus a time-boxed
  spike producing one working transport implementation for it — see
  `design.md` for the googleapis-vs-MCP decision criteria and default.
- Deterministic tentative-hold lifecycle code (not the model): create a
  hold (`pending` + tentative calendar event, FR-SLOT-02), release a hold on
  collision or failure, exclude other leads' `pending` holds from every
  future offer (FR-SLOT-01).
- The deterministic Ukrainian apology-and-retry path for calendar API
  failures (free/busy fetch, tentative-event creation) with conversation/
  booking state preserved for resumption (NFR-REL-01) — composed without an
  LLM call.
- Minimal `packages/db` schema addition: a `bookings` table carrying only
  the columns this slice needs to represent a hold (`id`, `slot_start`,
  `slot_end`, `status`, `calendar_event_id`, `created_at`); the `request_id`
  linkage to the not-yet-existing `requests` table (owned by S2 `intake`)
  is deferred — see `design.md` Decisions for the trade-off.

No requirement text in `openspec/specs/slots/spec.md` changes as a result of
this slice; this change implements the already-accepted baseline unchanged.

## Capabilities

### New Capabilities

(none — `slots` is an existing G2-passed baseline capability)

### Modified Capabilities

- `slots`: no requirement *text* changes. The change carries a `MODIFIED`
  delta (`specs/slots/spec.md`) only because OpenSpec's strict validator
  requires every change to have at least one delta and `ADDED` would
  collide with the already-existing baseline requirement names — the delta
  is the unedited baseline content, present so the archive step has
  something to apply against `openspec/specs/slots/spec.md` (see
  `design.md` Context and the delta file's own note for the full rationale).

## Impact

- **Packages touched:** `lib/` (new `lib/src/slots/` module tree), `packages/db`
  (new `bookings` table + migration/seed script). No changes to
  `packages/bot`, `packages/agent`, or `apps/dashboard` — those don't exist
  as consumers yet (S2/S3/S4 depend on this slice, not vice versa).
- **New external dependency:** the Google Calendar API v3 client (googleapis
  SDK and/or an MCP server, per the spike) becomes the third allowed
  outbound connection (NFR-LOCAL-01); the service-account JSON key and
  calendar id come from `.env` (`GOOGLE_APPLICATION_CREDENTIALS`,
  `GOOGLE_CALENDAR_ID`) per `.env.example` and TC-CAL-01 — no secret is
  committed (NFR-SEC-01, TC-SEC-01).
- **Test layers added:** Vitest unit tests in `lib/src/slots/*.test.ts`
  (TC-TEST-01) and an integration smoke test against the real DEMO calendar
  (free/busy round-trip, tentative create/delete, outage path).
- **Non-goals for this slice:** no bot conversation code, no dashboard UI,
  no `confirmed`/`declined` transitions (owned by `booking-hitl`, S4), no
  `requests`/`leads` tables (owned by `intake`, S2) — this slice only proves
  the calendar-backed slot and hold mechanics in isolation.
