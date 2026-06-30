## ADDED Requirements

### Requirement: Six-intent classification
On every non-command inbound message, the router SHALL issue a single deterministic LLM call that
classifies the message into exactly one intent: `log`, `query`, `metric`, `review_trigger`,
`correction`, or `answer`. The call SHALL use structured output (a JSON schema constraining `intent`
to that enum) at `temperature: 0`. There SHALL be no agent loop — one call, one structured result
(invariant #5). The `intent` value SHALL be one of those English literals regardless of the message
language (invariant #6).

#### Scenario: A food message classifies as log
- **WHEN** the user sends "200г куриного филе"
- **THEN** the router returns `intent: "log"` with the parsed quantity/product fields

#### Scenario: A question classifies as query
- **WHEN** the user sends "сколько белка сегодня?"
- **THEN** the router returns `intent: "query"`

#### Scenario: `answer` only when a question is pending
- **WHEN** the message is a bare reply (e.g. "5%") and no open question is pending for the user
- **THEN** the router does NOT return `intent: "answer"` (it falls back to another intent); `answer`
  is valid only while an open question is pending

### Requirement: Date resolution in user timezone
The router SHALL determine which calendar date a message belongs to. The LLM SHALL return a relative
date token (`today`, `yesterday`, or an explicit `YYYY-MM-DD`); **code** SHALL resolve that token to a
concrete date in the user's timezone (default `Europe/Kyiv`). The LLM SHALL NOT compute the current
date itself. A message containing a back-reference ("вчера", "yesterday", "утром вчера") SHALL
back-date the row to the prior local day.

#### Scenario: Default is the user's local today
- **WHEN** a message has no time reference
- **THEN** the resolved date is the user's current local date (their timezone)

#### Scenario: "вчера" back-dates to the prior local day
- **WHEN** the message contains "вчера" at the user's local time
- **THEN** the resolved date is the user's local date minus one day (not a timestamp)

### Requirement: No chat history sent to the model
The router SHALL send the model only the current message (and, when one is pending, the ephemeral
open-question + the user's reply). It SHALL NOT send prior conversation history (invariant #1 — the
DB is the memory; facts and totals come from SQL, never reconstructed from chat).

#### Scenario: Classification uses no prior turns
- **WHEN** the router classifies a message
- **THEN** the request payload contains no earlier conversation turns beyond an optional pending
  open-question + the single reply
