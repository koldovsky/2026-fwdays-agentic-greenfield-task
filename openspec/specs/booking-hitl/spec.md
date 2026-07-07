# Booking & Human-in-the-Loop Specification

## Purpose

Own the decision loop that turns a lead's `pending` slot hold into a confirmed,
declined, or re-proposed booking. The administrator — never the agent — makes
the call from the dashboard; the system relays the decision to the lead in
Telegram and keeps the DEMO Google Calendar in sync. Covers FR-HITL-01..04 and
guardrail FR-GUARD-01.
## Requirements
### Requirement: Pending request decision surface

A booking request in state `pending` SHALL appear on the dashboard, and the
administrator SHALL be offered exactly three actions on it: **Confirm**,
**Propose another time**, and **Decline** (FR-HITL-01). The decision actions
SHALL be available only while the request is `pending`.

#### Scenario: Pending request appears with three actions

- **GIVEN** a lead has picked a slot and the booking moved to `pending`
- **WHEN** the administrator opens the dashboard
- **THEN** the request is visible in the pending queue
- **AND** its request card offers exactly the actions Confirm, Propose another time, and Decline

#### Scenario: Decision actions absent on non-pending requests

- **GIVEN** a booking request in a terminal state (`confirmed`, `declined`, or `cancelled`)
- **WHEN** the administrator views its request card
- **THEN** none of the three decision actions is actionable for that request

#### Scenario: Decision actions absent once superseded by a re-proposal

- **GIVEN** the administrator previously clicked Propose another time on this booking, so its `bookings.status` is `cancelled` (superseded) while the lead's *conversation* state (a separate state machine, ADR-0001 §6) has returned to `proposing` with the admin's slots offered
- **WHEN** the administrator views that booking's card
- **THEN** none of the three decision actions is actionable for it — it is terminal (`cancelled`)
- **AND** a decision surface reappears only once the lead picks one of the offered slots and a new booking moves to `pending`

### Requirement: Lead notification after admin decision

After each admin decision the bot SHALL message the lead in Telegram
(FR-HITL-02): Confirm → a confirmation carrying the exact date and time;
Propose another time → the admin-suggested slot(s) presented as a new
proposal; Decline → a kind refusal that leaves the door open. All messages
SHALL follow BC-BRAND-01: Ukrainian, kind, pressure-free; the final
confirmation is the only message that may carry one exclamation mark and the
single sanctioned 🎵 emoji — refusal and re-proposal messages SHALL carry
neither.

#### Scenario: Confirmation message with date and time

- **GIVEN** a `pending` request for Tuesday 17:00
- **WHEN** the administrator clicks Confirm and the confirmation succeeds
- **THEN** the bot sends the lead a Ukrainian confirmation containing the exact date and time of the lesson
- **AND** the message contains at most one exclamation mark and at most one 🎵, and no other emoji

#### Scenario: Decline message is a kind refusal with the door open

- **GIVEN** a `pending` request
- **WHEN** the administrator clicks Decline
- **THEN** the bot sends the lead a kind Ukrainian refusal that explicitly invites them to return (door left open)
- **AND** the message contains no exclamation marks and no emoji

#### Scenario: Propose-another-time message carries the admin's slots

- **GIVEN** a `pending` request and the administrator has selected one or more alternative slots
- **WHEN** the administrator clicks Propose another time
- **THEN** the bot sends the lead the admin-suggested slot(s) as a new proposal with inline slot buttons
- **AND** the message contains no exclamation marks and no emoji

#### Scenario: Telegram send failure on close-out does not lose the decision (NFR-REL-01)

- **GIVEN** the administrator has made a decision on a `pending` request
- **WHEN** the Telegram API call to notify the lead fails
- **THEN** the already-committed state transition and calendar sync are NOT rolled back
- **AND** the delivery failure is durably recorded (`notifications.delivery_status = 'failed'`) and automatically retried by the bot's outbox drain loop on a subsequent tick, until it succeeds
- **AND** the lead notification is never silently dropped

### Requirement: Booking decision state transitions

Admin decisions SHALL drive the booking state machine (FR-HITL-03), and the
transitions SHALL be implemented as pure functions in `lib/` (TC-PURE-01):
Confirm → `confirmed`; Decline → `declined` with the held slot released;
Propose another time → the booking transitions to `cancelled` (superseded by
the re-proposal — distinct from a lead-initiated cancellation, but the same
`bookings.status` value) with the held slot released, while the lead's
*conversation* state returns to `proposing` with the administrator's
suggested slot(s) offered as the new proposal; a new `pending` booking is
created only once the lead picks one of those slots. A lead message arriving
after a terminal state starts a new request per FR-INTAKE-08 (owned by the
`intake` capability; cross-referenced here, not re-specified).

Note: `bookings.status` is a strict four-value enum {pending, confirmed,
declined, cancelled} (TC-DATA-01, ADR-0001 §4) — it is a separate state
machine from the per-chat *conversation* state, whose states include
`proposing` (ADR-0001 §6); `proposing` is never a `bookings.status` value.

#### Scenario: Confirm transitions the booking to confirmed

- **GIVEN** a booking in state `pending`
- **WHEN** the administrator confirms it (and calendar re-validation passes)
- **THEN** the booking state becomes `confirmed`
- **AND** the slot remains occupied and is excluded from future offers

#### Scenario: Decline releases the slot

- **GIVEN** a booking in state `pending` holding a slot
- **WHEN** the administrator declines it
- **THEN** the booking state becomes `declined`
- **AND** the held slot is released and appears as free in subsequent slot offers

#### Scenario: Propose another time supersedes the booking and reopens the conversation

- **GIVEN** a booking in state `pending` holding a slot
- **WHEN** the administrator proposes another time with selected slot(s)
- **THEN** the hold on the original slot is released and the booking's `bookings.status` becomes `cancelled` (superseded by the re-proposal)
- **AND** the tentative calendar event for that hold is deleted (FR-HITL-04)
- **AND** the lead's conversation state (ADR-0001 §6) returns to `proposing`, with the administrator's suggested slot(s) offered as the new proposal
- **AND** no `bookings.status` value outside {pending, confirmed, declined, cancelled} is ever introduced

#### Scenario: Decision on a request no longer pending is rejected

- **GIVEN** a booking request that has already left `pending` (e.g. the lead cancelled it per FR-INTAKE-07 while the card was open)
- **WHEN** the administrator submits a decision on it
- **THEN** the transition is rejected in code, the stored state is unchanged
- **AND** the dashboard shows the administrator the request's current state instead of a raw error

### Requirement: Admin-proposed slot validation

Slots the administrator submits with **Propose another time** SHALL be
validated by deterministic code before any state transition, calendar write,
or lead message (FR-HITL-03, BC-SCHEDULE-01): at least one slot must be
selected; every slot must lie on the Mon–Fri 10:00–20:00 grid (60-minute
lesson, last start 19:00) — Saturday/Sunday slots are rejected even if the
lead asked for a weekend (BC-SCHEDULE-01 forbids them "even on request");
and every slot must be free in the DEMO calendar's current free/busy state
and not held by another lead. FR-GUARD-03 constrains only the agent's own
offers; validating the administrator's input is owned here. A validation
failure SHALL leave the booking `pending`, send nothing to the lead, and
surface an inline error to the administrator — never a raw 500.

#### Scenario: Propose another time with zero slots selected is rejected

- **GIVEN** a `pending` request and no alternative slot selected
- **WHEN** the administrator submits Propose another time
- **THEN** the submission is rejected with an inline validation error asking for at least one slot
- **AND** the booking stays `pending`, no calendar change occurs, and no message is sent to the lead

#### Scenario: Admin-proposed slot outside the grid is rejected

- **GIVEN** a `pending` request and the administrator attempts to propose a Saturday slot or a 21:00 start
- **WHEN** the proposal is submitted
- **THEN** deterministic validation rejects it with an inline error naming the Mon–Fri 10:00–20:00 rule
- **AND** the booking stays `pending`, the original tentative event is untouched, and no message is sent to the lead

#### Scenario: Admin-proposed slot that is busy or held is rejected

- **GIVEN** a `pending` request and the administrator selects a slot that a fresh free/busy check shows as busy in the DEMO calendar (or held by another lead's `pending` booking)
- **WHEN** the proposal is submitted
- **THEN** the submission is rejected with an inline conflict message identifying the unavailable slot
- **AND** the booking stays `pending` and no message is sent to the lead

### Requirement: Calendar synchronization of admin decisions

Admin decisions SHALL sync the DEMO Google Calendar (FR-HITL-04, TC-CAL-01).
Confirm SHALL first re-validate the slot against the calendar's current
free/busy state, then upgrade the tentative event to **confirmed**, writing
the first-lesson brief (FR-INTAKE-06) into the event description. Decline —
and lead cancellation per FR-INTAKE-07 — SHALL **delete** the tentative
event. Propose another time SHALL likewise delete the tentative event of the
released hold. A Google Calendar API failure during any decision SHALL abort
the decision before the state transition commits (NFR-REL-01): the booking
stays `pending`, no lead message is sent, and the dashboard surfaces a
deterministic error so the administrator can retry — the calendar operation
always precedes the database commit, so the stores never diverge. (The
slots capability owns only lead-side free/busy fetch and event-creation
failures; decision-time calendar failures are owned here.)

#### Scenario: Confirm upgrades the tentative event with the brief

- **GIVEN** a `pending` booking with a tentative event in the DEMO calendar and a compiled first-lesson brief
- **WHEN** the administrator confirms and re-validation finds the slot still free
- **THEN** the tentative event is upgraded to a confirmed event at the same date and time
- **AND** the event description contains the first-lesson brief (goal, tastes, dream song, experience/comfort)

#### Scenario: Slot no longer free at Confirm (calendar collision)

- **GIVEN** a `pending` booking whose slot has meanwhile been taken by a conflicting busy interval in the DEMO calendar
- **WHEN** the administrator clicks Confirm
- **THEN** re-validation fails and the booking does NOT transition to `confirmed` (it stays `pending`)
- **AND** no confirmed calendar event is created
- **AND** the dashboard shows the administrator a conflict message offering Propose another time or Decline
- **AND** no confirmation message is sent to the lead

#### Scenario: Decline deletes the tentative event

- **GIVEN** a `pending` booking with a tentative event in the DEMO calendar
- **WHEN** the administrator declines the request
- **THEN** the tentative event is deleted from the calendar

#### Scenario: Lead cancellation deletes the tentative event

- **GIVEN** a `pending` booking with a tentative event in the DEMO calendar
- **WHEN** the lead cancels the request (FR-INTAKE-07)
- **THEN** the tentative event is deleted from the calendar

#### Scenario: Calendar API failure at Confirm leaves the booking pending (NFR-REL-01)

- **GIVEN** a `pending` booking with a tentative event in the DEMO calendar
- **WHEN** the administrator clicks Confirm and the calendar call errors (the re-validation free/busy fetch or the tentative-to-confirmed upgrade fails with a timeout, 5xx, or auth error)
- **THEN** the booking does NOT transition — it stays `pending` and the tentative event is left as-is
- **AND** no confirmation message is sent to the lead
- **AND** the dashboard surfaces a deterministic error on the request card and the administrator can retry the decision

#### Scenario: Tentative-event delete failure aborts Decline or Propose another time (NFR-REL-01)

- **GIVEN** a `pending` booking with a tentative event in the DEMO calendar
- **WHEN** the administrator clicks Decline or Propose another time and the calendar delete call fails
- **THEN** the state transition is NOT committed — the booking stays `pending` and the slot is not marked released
- **AND** no message is sent to the lead
- **AND** the dashboard surfaces a deterministic error and the administrator can retry; a slot is never reported free while its tentative event still blocks the calendar

### Requirement: Agent cannot confirm bookings

The agent SHALL never confirm a lesson on its own (FR-GUARD-01): the
transition to `confirmed` SHALL exist only in the dashboard's admin decision
handler, and the agent's tool set SHALL contain no tool that performs or
triggers that transition. This is a structural guarantee (static verification),
additionally probed by the guardrail eval `evals/cases/fr-guard-01.yaml`.

#### Scenario: No confirm tool in the agent's tool set

- **GIVEN** the agent's registered tool set
- **WHEN** the tool definitions are inspected (static assertion)
- **THEN** no tool exists that sets a booking to `confirmed` or writes a confirmed calendar event

#### Scenario: Lead pressure does not produce a confirmation

- **GIVEN** a booking in state `pending`
- **WHEN** the lead insists in chat that the lesson be confirmed immediately
- **THEN** the agent replies that the administrator will confirm shortly, without claiming the lesson is confirmed
- **AND** the booking state in the database remains `pending`

## Exclusions (intentional, MVP)

- **No authentication or authorization on decision actions**: the dashboard
  serves a single administrator on `localhost` only (NFR-LOCAL-01), and the
  PRD defines no auth at all — localhost trust model. Anyone who can reach
  the page can decide; an unauthorized-actor scenario is intentionally out
  of scope and must not be reported as a bug.
- **No automatic hold expiry**: a stale `pending` request waits for the
  administrator's decision; there is no timeout job.
- **No rescheduling of already-confirmed lessons**, no reminders, no payments
  (PRD "Out of scope").
- **Group joins** flow through this HITL loop only in the Future `groups`
  capability (FR-GROUP-01) — not specified here.
- **FR-INTAKE-07/08 behavior** (lead amendments, cancellation, re-entry after
  a terminal state) is owned by the `intake` capability; this spec only
  consumes its effects (slot release, new-request re-entry).
- The pending-queue and request-card **rendering** (HallMap, DecisionBar
  visuals) is owned by the `dashboard` capability (FR-DASH-01/03); this spec
  owns the decision semantics behind the actions.
