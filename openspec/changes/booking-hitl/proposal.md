## Why

`booking-hitl` is Slice S4 of the signed Phase 3 plan
(`docs/mvp-capability-plan.md` §S4, G3 2026-07-03) — the DAG's final fan-out
alongside S5 `kb-learning`, depending on all three prior slices (S1 `slots`
for the calendar adapter and hold lifecycle, S2 `intake` for the conversation
loop and `requests` rows, S3 `dashboard` for the surface the request card and
DecisionBar render into, all archived). The baseline spec
`openspec/specs/booking-hitl/spec.md` already passed G2; this change
implements it, unchanged, against real code, a real DEMO Google Calendar, and
a real Telegram chat. Until this slice lands, `DecisionBar`'s three buttons
POST to an inert stub (`{status:"not_connected"}`) and no booking can ever
leave `pending` — this is the ONLY place `bookings.status → confirmed` may
ever exist (FR-GUARD-01), so it is also the guardrail's structural home.

This slice also closes a gap left open on purpose by S2: `propose_slots` and
`request_hold` are defined in the agent's closed tool set but are
pass-through no-ops (`packages/agent/src/loop.ts`'s `applyToolUse`), so no
conversation has ever actually reached `awaiting_admin`/`pending` with a real
tentative calendar event. Without that wiring there is nothing for the
dashboard's DecisionBar to decide on — this slice supplies it.

## What Changes

- **Lead-side proposal/hold wiring**: `propose_slots` (model tool, `proposing`
  state) and `request_hold` (model tool, free text) plus a new inline-keyboard
  slot-chip tap (`"slot:<n>"`, bot callback, no agent call) both drive a new
  pure `offer_slots`/`pick_slot` pair on `lib/src/intake/state-machine.ts`'s
  closed `IntakeEvent` set, orchestrated through two new narrow ports
  (`SlotsPort`, `HoldStorePort`) that wrap S1's `proposeSlots`/
  `holdWithRecovery` and insert the `pending` `bookings` row (with
  `request_id`, Kyiv wall-clock `slot_start`/`slot_end`) — without adding a
  create/confirm method to the existing cancel-only `BookingStorePort`
  (FR-GUARD-01's structural guarantee stays intact) and without
  `packages/agent` importing the slots `CalendarPort` type (design.md
  Decision 2).
- **A new pure `lib/src/booking/` module** (TC-PURE-01): `applyBookingDecision`
  (the three admin transitions, pending-only guard) and
  `validateAdminProposedSlots` (Mon–Fri 10:00–20:00 grid, free/busy, not held
  by another lead — FR-HITL-03, BC-SCHEDULE-01), plus deterministic Ukrainian
  confirmation/decline/re-proposal copy (BC-BRAND-01).
- **The dashboard decision route** (`apps/dashboard/app/api/decisions/
  [requestId]/route.ts`) replaces the inert stub: validate → calendar op
  (calendar-before-DB-commit) → the pure transition → DB commit → INSERT a
  notification-outbox row → republish a dashboard-scoped `STATE_SNAPSHOT`.
- **A SQLite notification outbox** (`notifications` table, `delivery_status`
  pending/delivered/failed — the FR-KB-04/ADR-0001 §4 pattern) drained by a
  new short-timer loop in `packages/bot/src/index.ts`, the cross-process
  channel the decision route uses to reach the lead in Telegram (the LOCKED
  human decision recorded in `docs/current-state.md` 2026-07-07 and restated
  verbatim in `design.md` Decision 1).
- **The four S3 `dashboard` review-gate carryovers** (owner-flagged, see
  `openspec/changes/archive/2026-07-06-dashboard/review-findings.json`):
  pending-request-known-to-dashboard, idempotent calendar-delete across >1
  pending booking, real-time HallMap seat flip on a booking-status change,
  and the Kyiv-offset `slot_start` write contract — each discharged by a
  named mechanism in `design.md` Decision 6.

No requirement text in `openspec/specs/booking-hitl/spec.md` changes as a
result of this slice; this change implements the already-accepted baseline
unchanged (same convention S1/S2/S3 used).

## Capabilities

### New Capabilities

(none — `booking-hitl` is an existing G2-passed baseline capability)

### Modified Capabilities

- `booking-hitl`: no requirement *text* changes. The change carries a
  `MODIFIED` delta (`specs/booking-hitl/spec.md`) with the full, unedited
  baseline content — required by OpenSpec strict validation ("a change must
  carry at least one delta") — so the archive step maps cleanly onto the
  existing requirement names in `openspec/specs/booking-hitl/spec.md`,
  matching the precedent set by the archived `slots`/`intake` changes.

## Impact

- **Packages touched:** `lib/` (new `lib/src/booking/`; `lib/src/intake/
  state-machine.ts` gains `offer_slots`/`pick_slot`; `lib/src/slots/grid.ts`
  gains an exported `isSlotOnGrid` guard; `lib/src/slots/hold.ts`'s
  `releaseHold` gains 404/410-idempotent delete handling), `packages/agent`
  (new `SlotsPort`/`HoldStorePort` on `LoopPorts`; `tools.ts`'s `propose_slots`
  schema gains structured `weekdays`/`timeWindow` params), `packages/bot`
  (pipeline callback handling for `slot:<n>`; shared async hold-orchestration
  helpers; the outbox-drain timer in `index.ts`; inline-keyboard slot chips
  on outbound messages), `packages/db` (new `notifications` table + helpers;
  `bookings.insertBooking` persists `request_id`; a new
  `findBookingsByRequestId` helper; `requests` gains an `offered_slots` JSON
  column), `apps/dashboard` (the real decision route; the ingest route
  republishes a dashboard `STATE_SNAPSHOT` on `BOOKING_PENDING`).
- **Test layers added:** unit (`lib/src/booking/*.test.ts`, state-machine
  additions), agent-loop unit against `FakeModelPort`/fake `SlotsPort`/
  `HoldStorePort`, bot pipeline integration against real SQLite + a fake
  `CalendarPort`, dashboard route integration (real SQLite + fake
  `CalendarPort`), a guardrail eval (`evals/cases/fr-guard-01.eval.ts`), E2E
  (chrome-devtools/Playwright) DecisionBar click-through with axe + a fresh
  vision-judge pass.
- **Non-goals for this slice:** automatic hold expiry, rescheduling a
  confirmed lesson, group joins (`FR-GROUP-01`, Future), the Question inbox
  (`kb-learning`, S5, independent of this slice per the DAG).
- **Deferred, named with owner:** per-lead rate limiting on the Telegram
  surface stays a global hardening concern (unchanged since S2); the
  notification outbox's `attempts`/backoff policy beyond "retry every drain
  tick until delivered" is left simple by design (single-teacher, low
  volume) and can be revisited if the demo shows otherwise.
