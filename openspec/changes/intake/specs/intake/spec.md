## MODIFIED Requirements

> Note: OpenSpec strict validation requires every change to carry at least
> one delta (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`). The `intake`
> baseline spec already passed G2 (`openspec/specs/intake/spec.md`) and no
> requirement text changes as part of this slice — this change only
> *implements* the already-accepted requirements below. `MODIFIED` is used
> (with the full, unedited requirement blocks, per the delta workflow) so
> the archive step maps cleanly onto the existing baseline names rather than
> `ADDED`, which would collide with requirements that already exist in
> `openspec/specs/intake/spec.md` — the same convention the archived
> `slots` change (`openspec/changes/archive/2026-07-04-slots/`) established.

### Requirement: Immediate typing acknowledgement (bot responsiveness)

The bot SHALL send a Telegram `sendChatAction` (typing) call immediately on
any lead message, before the agent begins processing that message, so the
lead sees the bot is alive while a reply is composed — the conversation
layer owns bot responsiveness end-to-end. Measured from the bot receiving
the Telegram update to its first visible reaction (`sendChatAction` or
`sendMessage`, whichever comes first), the p90 latency SHALL be ≤ 5 seconds
(NFR-UX-01). This is a conversation-layer (bot) guarantee, not a dashboard
concern — the dashboard's streamed `ChatStream` display (`dashboard`
capability, FR-DASH-01) is a separate, downstream rendering of the same run
and does not own this latency budget.

#### Scenario: Typing indicator appears before the reply, then the reply follows

- **GIVEN** a lead sends a message to the bot
- **WHEN** processing that message (agent reasoning, tool calls, or KB lookup) takes longer than an instant
- **THEN** a Telegram typing indicator (`sendChatAction`) appears immediately, before the agent's reply text is ready
- **AND** the reply itself is sent once processing completes, without the typing indicator having been skipped

#### Scenario: p90 first-reaction latency is within budget

- **GIVEN** the eval-suite integration run logs the timestamp of each incoming Telegram update and of the bot's first `sendChatAction`/`sendMessage` call in response
- **WHEN** latencies across the run are aggregated
- **THEN** the p90 time from update to first visible reaction is ≤ 5 seconds (NFR-UX-01)

### Requirement: Core field collection

The agent SHALL collect, in conversation, the student's name, age, and format
(individual/group) during the `qualifying` state, and the preferred weekdays
and time range during the `collecting` state; the Telegram handle SHALL be
captured automatically from the incoming update, never asked. (FR-INTAKE-01,
ADR-0001 §6)

#### Scenario: Telegram handle is captured automatically

- **GIVEN** a lead writes to the bot for the first time
- **WHEN** the conversation starts
- **THEN** the lead's Telegram handle and chat id are stored on the request record
- **AND** the agent never asks the lead for their Telegram handle or phone number

#### Scenario: Student name is collected

- **GIVEN** the conversation is in the `qualifying` state and the student name is missing
- **WHEN** the agent sends its next message
- **THEN** it asks for the student's name (and only that field, per BC-BRAND-01)
- **AND** the answer is stored as the student name on the request

#### Scenario: Student age is collected

- **GIVEN** the name is known and the age is missing
- **WHEN** the agent sends its next message
- **THEN** it asks for the student's age
- **AND** the answer is normalized to a number (e.g. "їй сім" → 7) and stored on the request

#### Scenario: Lesson format is collected

- **GIVEN** name and age are known and the format is missing
- **WHEN** the agent sends its next message
- **THEN** it asks whether the lead wants individual or group lessons
- **AND** the answer is stored as `individual` or `group` on the request

#### Scenario: Lead unsure about format gets an explanation and is asked again

- **GIVEN** the agent asked for the format
- **WHEN** the lead answers that they are not sure or asks about the difference
- **THEN** the agent explains the difference between individual and group lessons using only the knowledge base (BC-FORMAT-01, BC-PRICE-01)
- **AND** asks the format question again
- **AND** the state does not advance until a format is chosen

#### Scenario: Preferred weekdays are collected

- **GIVEN** the conversation reached the `collecting` state
- **WHEN** the agent asks for schedule preferences
- **THEN** it collects the preferred weekdays (Mon–Fri) and stores them on the request

#### Scenario: Preferred time range is collected

- **GIVEN** preferred weekdays are known
- **WHEN** the agent asks for the preferred time window
- **THEN** the answer (e.g. "після 17:00") is stored as a time range on the request
- **AND** only after weekdays and time range are stored does the flow advance to `proposing`

### Requirement: Code-level validation before slot proposal

The system SHALL validate age against BC-AGE-01 and format against
BC-SCOPE-01/02 in deterministic code (pure functions in `lib/`, TC-PURE-01)
**before** the conversation advances out of `qualifying` and before any slot
is proposed; the system prompt alone is never the enforcement mechanism.
(FR-INTAKE-02)

#### Scenario: Valid age and format advance the flow

- **GIVEN** the lead provided name, age 9, and format `individual`
- **WHEN** the code-level validator runs
- **THEN** validation passes and the conversation advances from `qualifying` to `profiling`

#### Scenario: Validation happens before slots, not after

- **GIVEN** a lead whose provided age is 3
- **WHEN** the conversation would otherwise proceed
- **THEN** the validator rejects with `AGE_BELOW_MIN` before any slot is computed or offered
- **AND** no request in state `proposing` or later ever exists with age < 4

#### Scenario: Non-numeric or ambiguous age is re-asked, not guessed

- **GIVEN** the agent asked for the age
- **WHEN** the lead answers with text the code cannot normalize to a number (e.g. "ще маленька")
- **THEN** the agent asks a clarifying question for the exact age in Ukrainian
- **AND** the state does not advance and no age is stored

#### Scenario: Instrument-lesson format is rejected by the validator

- **GIVEN** the lead asks to book piano (or any instrument) lessons as the format
- **WHEN** the code-level validator runs
- **THEN** it rejects the value (BC-SCOPE-01/02) and the conversation takes the scope-explanation detour instead of advancing

### Requirement: Lesson goal capture

During `profiling` the agent SHALL ask what brings the lead in — karaoke with
friends, performing on stage, overcoming shyness, or their own words — and
store exactly one predefined tag (`karaoke` / `performance` / `confidence` /
`hobby` / `other`) plus the lead's verbatim answer. (FR-INTAKE-03)

#### Scenario: Goal matching a predefined tag

- **GIVEN** the agent asked about the goal
- **WHEN** the lead answers "хочу співати в караоке з друзями"
- **THEN** the tag `karaoke` and the verbatim answer are stored on the request

#### Scenario: Goal in the lead's own words

- **GIVEN** the agent asked about the goal
- **WHEN** the lead answers something outside the predefined options (e.g. "хочу записати пісню для дружини")
- **THEN** the tag `other` and the verbatim answer are stored
- **AND** the agent mirrors the goal back with respect and never ranks it (BC-BRAND-01: "для караоке — чудова ціль", no "лише")

#### Scenario: Skipping the goal question is allowed

- **GIVEN** the agent asked about the goal
- **WHEN** the lead declines to answer or says they don't know
- **THEN** the agent responds that it can be figured out at the lesson ("можемо з'ясувати це вже на занятті") and moves on
- **AND** the flow continues without the field, with no repeated pressure

### Requirement: Musical tastes capture

During `profiling` the agent SHALL ask about musical tastes — favourite
artists/songs, what's on the lead's playlist, and one song they would love to
sing; when the student is younger than 10 the questions SHALL be addressed to
the parent (favourite cartoons, songs the child sings along to). (FR-INTAKE-04,
BC-AGE-02)

#### Scenario: Tastes questions for a student aged 10 or older

- **GIVEN** the student's validated age is 14
- **WHEN** the agent asks the tastes questions
- **THEN** it asks about favourite artists/songs, the playlist, and one song they would love to sing, one question per message
- **AND** the answers are stored on the request

#### Scenario: Tastes questions for a student younger than 10 address the parent

- **GIVEN** the student's validated age is 7
- **WHEN** the agent asks the tastes questions
- **THEN** the questions are addressed to the parent about the child (favourite cartoons, songs the child sings along to)
- **AND** the phrasing never addresses the child directly (BC-AGE-02)

#### Scenario: Skipping tastes questions is allowed

- **GIVEN** the agent asked a tastes question
- **WHEN** the lead skips it
- **THEN** the agent accepts the skip kindly and continues; the brief later marks the field as not provided

### Requirement: Experience and comfort capture

During `profiling` the agent SHALL ask about prior experience (choir,
lessons) and whether singing a cappella or with a backing track feels more
comfortable; both answers SHALL be stored. The questions sound like curiosity,
never assessment (BC-BRAND-01). (FR-INTAKE-05)

#### Scenario: Prior training is asked and stored

- **GIVEN** the tastes questions are done
- **WHEN** the agent asks about previous training
- **THEN** the answer (e.g. "співала у шкільному хорі" or "ніякого") is stored on the request

#### Scenario: A cappella vs backing-track comfort is asked and stored

- **GIVEN** prior training is answered
- **WHEN** the agent asks whether a cappella or a backing track feels more comfortable
- **THEN** the answer is stored on the request

#### Scenario: No grading or level-check language

- **GIVEN** any experience/comfort question is asked
- **WHEN** the message text is inspected
- **THEN** it contains no assessment framing — phrases like "перевіримо твій рівень" never appear (BC-BRAND-01 rubric anchor)

### Requirement: First-lesson brief

The system SHALL compile goal, tastes (including the dream song), and
experience/comfort answers into a first-lesson brief on the request card, so
the teacher can prepare the trial lesson around music the student already
loves. (FR-INTAKE-06, BC-LESSON-01)

#### Scenario: Complete brief on the request card

- **GIVEN** a lead answered the goal, tastes, and experience questions
- **WHEN** the request reaches `pending` and appears on the dashboard
- **THEN** the request card shows a first-lesson brief containing the goal tag + verbatim goal, tastes, the dream song, and experience/comfort

#### Scenario: Brief with skipped answers

- **GIVEN** a lead skipped the tastes questions
- **WHEN** the brief is compiled
- **THEN** skipped fields are explicitly marked as not provided (never invented or filled with model guesses)

### Requirement: Amend and cancel before the decision

Before the administrator's decision the lead SHALL be able to amend any
collected field or cancel the request; cancellation releases the held slot and
sets the booking to `cancelled`. (FR-INTAKE-07)

#### Scenario: Amending a field mid-flow

- **GIVEN** a request in any state before the admin decision, with age recorded as 6
- **WHEN** the lead writes "насправді їй 7, не 6"
- **THEN** the age field is updated to 7, the change is re-validated in code (FR-INTAKE-02)
- **AND** the conversation resumes at the state where it left off

#### Scenario: Amending a field that changes question addressing

- **GIVEN** profiling questions were addressed to the parent because the recorded age was 9
- **WHEN** the lead corrects the age to 12
- **THEN** subsequent questions address the student directly per BC-AGE-02 applied to the corrected age

#### Scenario: Cancelling releases the held slot

- **GIVEN** a request in `awaiting_admin` with a slot on soft hold (`pending`)
- **WHEN** the lead asks to cancel
- **THEN** the booking status becomes `cancelled`, the held slot is released (and its tentative calendar event deleted per FR-HITL-04)
- **AND** the bot confirms the cancellation kindly in Ukrainian, door left open

#### Scenario: Amend attempted after a terminal state

- **GIVEN** the lead's previous request is `confirmed`
- **WHEN** the lead writes "хочу змінити день"
- **THEN** the agent does not modify the terminal request; it explains that the request is already decided and MVP has no rescheduling, and offers to start a new request (FR-INTAKE-08)

### Requirement: New request after a terminal state

The system SHALL start a new request when a message arrives from a known
Telegram handle whose previous request is in a terminal state (`confirmed` /
`declined` / `cancelled`); the student profile lives on the request, so
earlier requests are never overwritten. (FR-INTAKE-08, TC-DATA-01)

#### Scenario: Returning lead starts a fresh request

- **GIVEN** a lead whose previous request is `cancelled`
- **WHEN** they message the bot again
- **THEN** a new request record is created and the intake flow starts from `qualifying`
- **AND** the previous request record remains unchanged in the database

#### Scenario: Second trial for a sibling

- **GIVEN** a parent whose first request (child A, age 12) is `confirmed`
- **WHEN** they write to book a trial for child B, age 6
- **THEN** the new request carries child B's own profile (name, age, tastes)
- **AND** child A's request and profile are intact and separately readable

### Requirement: Minimum-age guardrail

The agent SHALL never book a student younger than 4: age is validated in
deterministic code returning `AGE_BELOW_MIN`, not only in the prompt. The
refusal is kind, in Ukrainian, ends with a door left open, and the
conversation enters the terminal `soft_decline` state with no request created.
(FR-GUARD-04, BC-AGE-01, ADR-0001 §6)

#### Scenario: Age below minimum gets a kind refusal

- **GIVEN** the lead says the child is 3
- **WHEN** the code validator returns `AGE_BELOW_MIN`
- **THEN** the bot replies in Ukrainian with a warm refusal that invites them back at 4 ("від 4 років — чекатимемо на вас" in spirit), with no pressure vocabulary
- **AND** no booking request is created and no slots are ever offered
- **AND** the conversation state becomes `soft_decline` (terminal)

#### Scenario: Enforcement is code, not prompt

- **GIVEN** the unit test suite for `lib/` age validation
- **WHEN** `validateAge(3)` is called
- **THEN** it returns the `AGE_BELOW_MIN` error code deterministically, with no LLM involved

#### Scenario: Persuasion after soft decline does not create a request

- **GIVEN** the conversation is in `soft_decline`
- **WHEN** the lead argues ("вона дуже здібна, зробіть виняток")
- **THEN** the bot kindly repeats the age rule without creating a request
- **AND** a later message about an eligible student (e.g. an older sibling, age 5) starts a normal new intake

### Requirement: Off-topic steering

The agent SHALL, on an off-topic message (politics, medicine, law, religion,
and similar), reply with no substantive answer to the off-topic question
and SHALL redirect to the school within the same reply; the conversation then
resumes at the state where it left off — an off-topic turn is a resumable
detour, never a reset. (FR-GUARD-05, ADR-0001 §6)

#### Scenario: Off-topic question mid-intake

- **GIVEN** the conversation is in `profiling` waiting for the goal answer
- **WHEN** the lead asks a political question
- **THEN** the single reply contains no substantive answer to the question and redirects to the school topic
- **AND** the same reply (or the immediately following turn) re-asks the pending goal question — the state is still `profiling`

#### Scenario: Repeated off-topic messages

- **GIVEN** the lead sends a second off-topic message in a row
- **WHEN** the agent replies
- **THEN** it again declines substantively and redirects, staying kind and pressure-free (tone graded by `evals/cases/fr-guard-05.yaml`)
- **AND** the collected fields and conversation state are preserved intact

### Requirement: Voice-only scope detour

A request for instrument lessons (piano and similar) SHALL trigger a polite
explanation that the school teaches voice only and the piano is used by the
teacher solely to accompany vocal warm-ups — never a promise of instrument
lessons — followed by an offer of a voice trial; the detour is resumable.
(FR-INTAKE-02, BC-SCOPE-01, BC-SCOPE-02, ADR-0001 §6)

#### Scenario: Piano lesson request

- **GIVEN** a lead at any point in the flow asks for piano lessons
- **WHEN** the agent replies
- **THEN** it explains in Ukrainian that the school teaches voice only and the piano only accompanies warm-ups, without promising instrument lessons
- **AND** it offers a vocal trial lesson as the nearest yes (DESIGN.md kind-refusal rule)
- **AND** if the lead agrees, the conversation resumes at the state where it left off

#### Scenario: Other instrument request

- **GIVEN** a lead asks about guitar (or any non-voice subject)
- **WHEN** the agent replies
- **THEN** the same voice-only explanation and voice-trial offer apply; no instrument lesson is ever recorded as a request

### Requirement: Ukrainian replies and one-question tone

The agent SHALL understand input in any language but always reply in
Ukrainian, SHALL ask for exactly one missing field per message, and SHALL keep
the get-to-know questions in a curiosity register — never assessment, never
pressure vocabulary. (BC-LANG-01, BC-BRAND-01; scoped to FR-INTAKE-01 and
FR-INTAKE-03..05 conversation turns)

#### Scenario: Foreign-language input gets a Ukrainian reply

- **GIVEN** a lead writes in English or Russian
- **WHEN** the agent replies
- **THEN** the reply is entirely in Ukrainian while correctly acting on the input's meaning

#### Scenario: Exactly one question per message

- **GIVEN** several intake fields are still missing
- **WHEN** the agent sends any intake message
- **THEN** the message asks for exactly one missing field, never a multi-field form

#### Scenario: No pressure vocabulary anywhere in intake

- **GIVEN** any intake reply
- **WHEN** its text is inspected
- **THEN** it contains no scarcity or pressure phrases ("останнє місце", "тільки сьогодні", "поспішайте") and effectively no exclamation marks (DESIGN.md)

### Requirement: Privacy notice and data deletion

The bot's greeting SHALL carry a one-line notice that messages are processed
via the Anthropic API, and a lead's record (with its questions and bookings)
SHALL be deletable on request via an admin action. (NFR-PRIV-02) The delete
action itself — the confirmation step and the cascade delete — is owned by
the `dashboard` capability ("Delete-lead admin action"); this requirement
only owns the lead-facing promise and the greeting notice.

#### Scenario: Greeting carries the processing notice

- **GIVEN** a lead starts a conversation
- **WHEN** the bot sends its greeting
- **THEN** the greeting includes a one-line Ukrainian notice that messages are processed via the Anthropic API

#### Scenario: Lead requests data deletion

- **GIVEN** a lead asks the bot to delete their data
- **WHEN** the request is relayed and the administrator performs the deletion action
- **THEN** the lead's record, together with its questions and bookings, is deleted from the database
- **AND** the agent never claims the deletion happened before the admin action completes
