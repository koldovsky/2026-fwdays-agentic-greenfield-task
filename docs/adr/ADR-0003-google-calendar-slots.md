# ADR-0003: Google Calendar as the schedule source — grid ∩ free/busy, tentative holds, convenience ranking

- **Status:** Accepted (supersedes ADR-0001 §4 for the schedule source)
- **Date:** 2026-07-03
- **Deciders:** user + orchestrator

## Context

The teacher's real availability lives in a calendar, not in a hand-seeded
table. The user requires booking against a dedicated personal **DEMO Google
Calendar**, with the agent picking the most convenient slot for both the lead
and the teacher. ADR-0001 had kept calendars out of scope and pre-generated
slots in SQLite; that part is superseded. The guardrails must survive the
change: Mon–Fri 10:00–20:00 only (FR-GUARD-03, BC-SCHEDULE-01), and the model
must never gain a write path that commits the school to anything
(FR-GUARD-01).

## Decision

1. **Hybrid slot computation.** Free slots = deterministic Mon–Fri grid
   (10:00–19:00 starts, 60-min step, generated in `lib/`) **minus** busy
   intervals from the DEMO calendar's free/busy API. The calendar can only
   *remove* options, never add them — FR-GUARD-03 stays enforced in code
   (TC-DATA-01, FR-SLOT-01).
2. **Convenience ranking in code.** A pure `rankSlots()` in `lib/` scores the
   free slots: lead's preferred weekdays/window first, then **teacher
   convenience** — minimal schedule fragmentation (adjacency to existing
   events, no isolated gaps), then earlier dates. The agent presents the
   top-ranked 2–3; the model chooses among code-vetted options only
   (FR-SLOT-04).
3. **Tentative hold, human finalization.** When the lead picks a slot,
   deterministic hold code creates a **tentative** event (FR-SLOT-02) — this
   also makes the hold visible in Google and blocks the interval via free/busy.
   The admin's Confirm re-validates the slot against the calendar, then
   upgrades the event to confirmed and writes the first-lesson brief into its
   description; Decline or lead cancellation deletes the tentative event
   (FR-HITL-04). The `confirmed` transition remains admin-only (FR-GUARD-01).
4. **Auth: service account + sharing** (TC-CAL-01). The personal DEMO calendar
   is shared with a service account ("Make changes"); the JSON key lives in a
   gitignored file referenced from `.env` — no browser flows, headless-friendly.
5. **Polling only.** Free/busy is queried on demand; no push channels or
   webhooks — inbound connections stay forbidden (NFR-LOCAL-01). Google
   Calendar API becomes the third allowed outbound connection.
6. **Pure core, thin adapter.** `lib/` stays free of the Google SDK; all
   calendar I/O goes through one adapter interface (TC-PURE-01), so grid,
   subtraction, and ranking are unit-testable with fixture busy-lists. The
   adapter's transport is chosen by a time-boxed spike at implementation:
   a Google Calendar **MCP server** consumed by the backend (the backend is
   the MCP client — the model never gets raw calendar tools) or the googleapis
   SDK as fallback; the interface makes the transports swappable.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Grid ∩ calendar free/busy + code ranking (chosen) | Real teacher schedule; guardrails stay in code; ranking testable | Third outbound dependency; needs NFR-REL-01 handling |
| Pre-generated SQLite slots (ADR-0001 §4) | Zero dependencies | Fiction: ignores the teacher's real calendar; superseded |
| Raw calendar tools given to the model | Flexible | Model could offer/write outside the rules — fails FR-GUARD-01/03 |
| OAuth installed-app flow | Acts as the human | Browser flow + token refresh moving parts; service account is simpler locally |
| Two-way sync via push webhooks | Instant updates | Requires a public URL — breaks NFR-LOCAL-01; polling suffices at this scale |

## Consequences

- **Easier:** the demo shows a real calendar filling up; the teacher sees holds
  (tentative) and confirmed lessons with the first-lesson brief in one place;
  `rankSlots()` becomes the flagship pure-function slice.
- **Harder / accepted:** a third external dependency (covered by NFR-REL-01);
  manual teacher edits can race a hold — mitigated by Confirm-time
  re-validation (FR-HITL-04); free/busy polling adds latency to slot proposals
  (budgeted within NFR-UX-01).
- **Follow-up:** the `slots` spec must include error paths for calendar
  unavailability and for a hold-vs-manual-event collision.
