## MODIFIED Requirements

> Note: OpenSpec strict validation requires every change to carry at least
> one delta (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`). The
> `dashboard` baseline spec already passed G2
> (`openspec/specs/dashboard/spec.md`) and no requirement text changes as
> part of this slice — this change only *implements* the already-accepted
> requirements below. `MODIFIED` is used (with the full, unedited
> requirement blocks, per the delta workflow) so the archive step maps
> cleanly onto the existing baseline names rather than `ADDED`, which would
> collide with requirements that already exist in
> `openspec/specs/dashboard/spec.md` — the same convention the archived
> `slots` and `intake` changes established.

### Requirement: AG-UI over SSE transport

The dashboard SHALL receive all real-time data as AG-UI events over a
Server-Sent Events stream (TC-PROTO-01, ADR-0001 §2), consuming at minimum:
`RUN_STARTED`/`RUN_FINISHED`/`RUN_ERROR` (run boundaries, including a failed
run — never a silent gap, NFR-REL-01), `TEXT_MESSAGE_*` (streamed agent
replies), `STATE_SNAPSHOT`/`STATE_DELTA` (request card state), and the
custom `BOOKING_PENDING` event (renders the DecisionBar). The dashboard SHALL
NOT poll the database for data that these events carry.

#### Scenario: Agent run is delineated by run events

- **GIVEN** the dashboard is connected to the SSE endpoint
- **WHEN** the agent starts processing a lead message
- **THEN** the dashboard receives a `RUN_STARTED` event and renders a visible
  activity indicator on the corresponding conversation — a distinct UI element
  present in the DOM only between `RUN_STARTED` and `RUN_FINISHED`
- **AND** when the agent finishes the turn, a `RUN_FINISHED` event arrives and
  that indicator is removed

#### Scenario: Unknown event types are ignored safely

- **GIVEN** the dashboard is connected to the SSE stream
- **WHEN** an event with an unrecognized type arrives (e.g. a future
  `TOOL_CALL_*` event not rendered in MVP)
- **THEN** the dashboard ignores it without crashing, without a console error
  dialog, and without corrupting the rendered state

#### Scenario: Unparseable event payload is dropped

- **GIVEN** the dashboard is connected to the SSE stream
- **WHEN** an event arrives whose data is not valid JSON (e.g. a truncated
  frame)
- **THEN** the dashboard drops that event without crashing and without
  altering any rendered state
- **AND** subsequent well-formed events on the same stream are still processed

#### Scenario: Event referencing an unknown request id is ignored

- **GIVEN** the dashboard is connected and rendering known requests
- **WHEN** a `STATE_DELTA` or `BOOKING_PENDING` event arrives whose request id
  matches no request known to the dashboard
- **THEN** the dashboard does not render a card or queue entry for the unknown
  id and does not crash
- **AND** existing conversations, cards, and the queue remain unchanged, and
  subsequent events are still processed (the dashboard converges on the next
  `STATE_SNAPSHOT`)

#### Scenario: Delta patching a nonexistent field is discarded

- **GIVEN** the request card renders known intake fields
- **WHEN** a `STATE_DELTA` arrives containing an operation that targets a
  field path not present in the card's state model
- **THEN** the offending operation is discarded — no new unknown field is
  rendered and no crash occurs
- **AND** valid operations in the same delta (if any) are still applied, and
  the card converges to the server's truth on the next `STATE_SNAPSHOT`

### Requirement: Live conversation view with streamed agent text

The dashboard SHALL show active conversations with the agent's replies
streamed as they are produced (FR-DASH-01): `TEXT_MESSAGE_*` events append
text to the conversation's `ChatStream` incrementally, so the teacher sees
the reply forming token-by-token rather than only after the run completes.
This is a dashboard-rendering concern only: the p90 ≤ 5 s bot-latency target
of NFR-UX-01 (time from a Telegram update to the bot's first visible
reaction) is owned by the `intake` capability, which sends `sendChatAction`
before the dashboard ever receives a `RUN_STARTED` event; this requirement
governs how the reply is displayed once streaming starts, not how quickly it
starts.

#### Scenario: Agent reply streams into the conversation view

- **GIVEN** the dashboard is open and a lead is mid-conversation with the bot
- **WHEN** the agent generates a reply and `TEXT_MESSAGE_START`,
  `TEXT_MESSAGE_CONTENT` (one or more), and `TEXT_MESSAGE_END` events arrive
- **THEN** the conversation view renders the message growing incrementally
  with each `TEXT_MESSAGE_CONTENT` chunk, before `RUN_FINISHED` arrives
- **AND** after `TEXT_MESSAGE_END` the message is displayed as a complete,
  stable message

#### Scenario: Multiple concurrent conversations are kept separate

- **GIVEN** two different leads are talking to the bot at the same time
- **WHEN** interleaved `TEXT_MESSAGE_*` events for the two conversations
  arrive on the stream
- **THEN** each chunk is appended only to the conversation it belongs to, and
  no text from one lead's conversation appears in the other's view

### Requirement: Live request card state

The dashboard SHALL render the current request state — the collected intake
fields (student name, age, format, preferred weekdays/time, goal, tastes,
experience) — on a `RequestCard` that fills in live as the agent collects
data (FR-DASH-01): `STATE_SNAPSHOT` replaces the card's state wholesale;
`STATE_DELTA` patches individual fields.

#### Scenario: Request card fields fill in as the agent collects them

- **GIVEN** the dashboard shows the request card for an in-progress intake
  where only the student name is known
- **WHEN** the lead tells the agent the student's age and a `STATE_DELTA`
  event carrying the age arrives
- **THEN** the age field appears on the request card without a page reload,
  and previously filled fields remain unchanged

#### Scenario: State snapshot replaces card state wholesale

- **GIVEN** the dashboard has rendered some request card state
- **WHEN** a `STATE_SNAPSHOT` event arrives for that request
- **THEN** the card renders exactly the snapshot's contents — fields present
  in the snapshot are shown, and any previously rendered field absent from
  the snapshot is no longer shown

#### Scenario: Amended field updates the card

- **GIVEN** the request card shows age 6
- **WHEN** the lead corrects the age to 7 (FR-INTAKE-07) and the resulting
  `STATE_DELTA` arrives
- **THEN** the card shows age 7 and no stale value remains visible

### Requirement: Pending request queue

The dashboard SHALL show the queue of `pending` requests in real time
(FR-DASH-01). When a custom `BOOKING_PENDING` event arrives, the request
SHALL join the queue and its request card SHALL render the `DecisionBar`
(Confirm / Propose another time / Decline). This spec owns the *rendering*
of the queue and DecisionBar; the decision handling, state transitions, and
lead notifications are owned by `booking-hitl` (FR-HITL-01..04).

#### Scenario: New pending request appears in the queue

- **GIVEN** the dashboard is open with N pending requests in the queue
- **WHEN** a lead picks a slot and a `BOOKING_PENDING` event arrives
- **THEN** the queue shows N+1 requests without a page reload, with the new
  request carrying its collected fields and first-lesson brief
- **AND** the new request's card renders the DecisionBar with the actions
  Confirm, Propose another time, and Decline

#### Scenario: Decided request leaves the pending queue

- **GIVEN** a request is in the pending queue
- **WHEN** the administrator (the teacher — the same single person per
  NFR-LOCAL-01) decides it (any of the three actions) and the resulting state
  update event arrives on the stream
- **THEN** the request is removed from the pending queue without a page
  reload

#### Scenario: Cancelled request leaves the pending queue

- **GIVEN** a request is in the pending queue
- **WHEN** the lead cancels the request in Telegram (FR-INTAKE-07) and the
  resulting state update event arrives
- **THEN** the request is removed from the pending queue and, if its card is
  open, the card shows the `cancelled` status instead of the DecisionBar

### Requirement: Oversized and atypical field content

The dashboard SHALL render lead-supplied text of any length without breaking
layout (FR-DASH-01): long values are visually bounded (line-clamped or
scrollable within their own container) with the full text still reachable,
the page never gains a horizontal scrollbar because of content length, and
content is rendered verbatim — no crash or mangling for emoji, mixed-script,
or locale-formatted values.

#### Scenario: Multi-thousand-character answer on the request card

- **GIVEN** a lead's goal or tastes answer is several thousand characters long
- **WHEN** the request card renders that field
- **THEN** the value is confined to a bounded region of the card — clamped to
  a fixed number of lines or scrollable within the field's own container —
  and the full text is reachable (by scrolling that container or an explicit
  expand control)
- **AND** the other card fields and the DecisionBar (when present) remain
  visible, and the page shows no horizontal scrollbar

#### Scenario: Extremely long first-lesson brief in the queue

- **GIVEN** a pending request whose first-lesson brief is several thousand
  characters long
- **WHEN** the queue renders that request's entry
- **THEN** the queue entry clamps the brief to its fixed entry height, other
  queue entries stay fully visible, and the page shows no horizontal
  scrollbar
- **AND** opening the request's card gives access to the full brief per the
  request-card scenario above

#### Scenario: Very long streamed message in the ChatStream

- **GIVEN** the agent streams a reply far longer than the visible chat area
- **WHEN** the `TEXT_MESSAGE_CONTENT` chunks render
- **THEN** the ChatStream scrolls vertically within its own container — the
  message wraps, no horizontal scrollbar appears, and the surrounding layout
  (queue, HallMap) keeps its dimensions
- **AND** the stream stays live: chunks continue to append while the long
  message renders

#### Scenario: Locale-atypical content renders verbatim

- **GIVEN** a lead's answers contain emoji, mixed Ukrainian/Latin script, and
  a locale-formatted number (e.g. an age written as "7 років" or a time as
  "17.00")
- **WHEN** the request card and ChatStream render them
- **THEN** the characters are displayed verbatim — no mojibake, no dropped
  emoji, no crash — and the dashboard does not reformat or reinterpret the
  stored values (validation and normalization are owned by intake, not the
  dashboard)

### Requirement: Concert-hall week schedule (HallMap)

The dashboard SHALL render the current week's schedule as a concert-hall map
— the `HallMap` component per DESIGN.md (FR-DASH-03): weekdays (Mon–Fri) are
rows, hour slots (10:00–19:00 starts) are seats, and each seat is colored by
the semantic status tokens: free (quiet outline), `pending` (amber),
`confirmed` (green), `cancelled` (slate; `declined` bookings also use this
token). Because a released (`cancelled`/`declined`) booking frees its slot
(FR-INTAKE-07, FR-HITL-03), one seat may carry several bookings; the seat's
color SHALL be decided by precedence: `confirmed` > `pending` >
`cancelled`/`declined` (slate) > free. A seat whose only bookings in the
current week are released renders slate — it does not revert to the free
outline. Clicking a `pending` seat SHALL open that request's card with the
DecisionBar.

#### Scenario: Week renders as rows of seats

- **GIVEN** the current week has at least one booking in each of the states
  `pending`, `confirmed`, and `cancelled`
- **WHEN** the administrator opens the dashboard
- **THEN** the HallMap shows exactly five rows (Mon–Fri) and, per row, one
  seat per hourly slot start from 10:00 through 19:00
- **AND** each seat's color matches its booking status via the
  `--status-*` tokens: free seats a quiet outline, `pending` amber,
  `confirmed` green, `cancelled` slate

#### Scenario: Clicking a pending seat opens the request card

- **GIVEN** the HallMap shows a `pending` seat
- **WHEN** the administrator clicks that seat
- **THEN** the corresponding request card opens, showing the collected fields
  and first-lesson brief, with the DecisionBar rendered

#### Scenario: Clicking a free seat does not open a request card

- **GIVEN** the HallMap shows a free seat
- **WHEN** the administrator clicks it
- **THEN** no request card opens and no error is shown (administrator-side seat
  booking is not supported in MVP; lead-side picking is Future, FR-WEB-01)

#### Scenario: HallMap reflects state changes in real time

- **GIVEN** the HallMap shows a seat as free
- **WHEN** a lead's chosen slot moves to `pending` and the corresponding
  event arrives on the stream
- **THEN** that seat turns amber without a page reload

#### Scenario: Weekend days are never shown

- **GIVEN** the administrator opens the dashboard on any day of the week
- **WHEN** the HallMap renders
- **THEN** Saturday and Sunday rows are absent (BC-SCHEDULE-01)

### Requirement: SSE reconnect without state loss

The dashboard SHALL survive an SSE disconnect: the client SHALL reconnect
automatically, and on (re)connect the server SHALL send a `STATE_SNAPSHOT`
so the dashboard converges to the current truth — no stale conversation,
queue, or HallMap state persists, and no manual page reload is required.

#### Scenario: Reconnect restores full state via snapshot

- **GIVEN** the dashboard is open and connected
- **WHEN** the SSE connection drops (e.g. the server process restarts) and
  events occur while the client is disconnected (a new pending request
  arrives)
- **THEN** the client reconnects automatically, receives a `STATE_SNAPSHOT`,
  and renders the current state including the request that went `pending`
  during the outage — with no page reload

#### Scenario: Disconnected state is visible, not silent

- **GIVEN** the dashboard is open
- **WHEN** the SSE connection is down and has not yet reconnected
- **THEN** the dashboard shows a visible connection indicator (rather than
  silently displaying data as live), and clears it once reconnected

#### Scenario: Reconnect does not duplicate entries

- **GIVEN** the dashboard showed a pending request before a disconnect
- **WHEN** the connection is restored and the `STATE_SNAPSHOT` includes that
  same request
- **THEN** the queue shows the request exactly once (snapshot replaces,
  never appends)

### Requirement: Empty states

The dashboard SHALL render explicit, friendly empty states — never a blank
region, a spinner that never resolves, or an error — when there is no data.

#### Scenario: No active conversations

- **GIVEN** no lead is currently talking to the bot
- **WHEN** the administrator opens the dashboard
- **THEN** the conversation area shows an explicit empty state (e.g. "Поки що
  тихо — розмов немає") instead of a blank panel or an error

#### Scenario: No pending requests

- **GIVEN** there are zero `pending` requests
- **WHEN** the administrator opens the dashboard
- **THEN** the queue area shows an explicit empty state and a pending count
  of 0, not a blank panel

#### Scenario: Week with no bookings

- **GIVEN** the current week has no bookings in any state
- **WHEN** the HallMap renders
- **THEN** all seats render as free (quiet outline) and the map is fully
  interactive — no error and no missing rows

### Requirement: Localhost-only serving

The dashboard SHALL be served on `localhost` (127.0.0.1) only and SHALL NOT
listen on external interfaces or require any inbound connection from outside
the machine (NFR-LOCAL-01, ADR-0001 §1). There is no authentication layer in
MVP: the localhost binding is the access boundary (single teacher, single
machine).

#### Scenario: Dashboard binds to loopback only

- **GIVEN** the dashboard dev server is running
- **WHEN** a client requests it via `127.0.0.1:3000`
- **THEN** the dashboard is served
- **AND** the server is not reachable from another machine on the network
  (it does not listen on `0.0.0.0`)

### Requirement: Delete-lead admin action

The dashboard SHALL offer a **Delete lead** action on the lead's card (or its
request card) that lets the administrator remove a lead's data on request
(NFR-PRIV-02). The action SHALL require an explicit confirmation step before
any deletion occurs — a single click SHALL NOT delete data. On confirmation
the server SHALL perform a cascade delete of the lead row together with all
of its `requests` and `bookings` rows; if any of those bookings is `pending`
with a tentative event in the DEMO Google Calendar, that tentative event
SHALL be deleted as part of the same action (consistent with the calendar
cleanup `booking-hitl` performs on Decline/cancel). The lead-facing promise
that "a lead's record ... is deletable on request via an admin action"
(NFR-PRIV-02, owned narratively by `intake`) is fulfilled by this action.

#### Scenario: Confirming delete removes the lead and cascades

- **GIVEN** a lead's card is open, and the lead has one or more `requests` and `bookings` rows, including a `pending` booking with a tentative calendar event
- **WHEN** the administrator clicks Delete lead and confirms the action in the confirmation step
- **THEN** the lead row, all of its `requests` rows, and all of its `bookings` rows are deleted from the database
- **AND** the tentative calendar event for the `pending` booking is deleted from the DEMO Google Calendar
- **AND** the lead's card and any of its entries in the queue or HallMap are removed from the dashboard without a page reload

#### Scenario: Aborting the confirmation step keeps the data intact

- **GIVEN** the administrator clicks Delete lead and the confirmation step appears
- **WHEN** the administrator dismisses or cancels the confirmation instead of confirming
- **THEN** no deletion occurs — the lead, its requests, its bookings, and any tentative calendar event are all unchanged
- **AND** the dashboard shows the lead exactly as before

#### Scenario: Deletion failure surfaces an inline error, not a raw 500

- **GIVEN** the administrator confirms Delete lead
- **WHEN** the cascade delete or the calendar-event delete fails partway (e.g. a database or calendar API error)
- **THEN** the dashboard surfaces a deterministic inline error naming the failure, never a raw 500 page
- **AND** the administrator can retry the deletion

## Exclusions (intentional, MVP)

- **Question inbox** — owned by `kb-learning` (FR-KB-02/03); not part of this
  capability even though it renders on the same dashboard page.
- **Admin decision handling** — the POST handlers, booking state transitions,
  calendar sync, and lead notifications are owned by `booking-hitl`
  (FR-HITL-01..04, FR-GUARD-01); this spec covers only rendering the queue
  and DecisionBar.
- **Raw AG-UI developer panel** (FR-DASH-02) — Future; intentionally
  unsupported in MVP.
- **Lead-facing seat picking on the HallMap** (FR-WEB-01) — Future; in MVP
  the HallMap is read-only except for opening `pending` request cards.
- **Authentication / multi-user access** — intentionally unsupported; the
  dashboard is localhost-only for a single teacher.
