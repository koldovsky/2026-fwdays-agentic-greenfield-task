# nutrition-query

## Purpose

Nutrition Q&A (US-4): when the router classifies an inbound message as `query`, the system answers
by aggregating the user's `food_log` rows in SQL for the router-resolved date — never by
reconstructing the answer from chat history (invariant #1). Every reported total is a single
tenant-scoped SQL `_sum` over that day's rows, never hand-summed in application code (invariant #2).
The asked nutrient is resolved by a deterministic keyword parser with no LLM call (invariant #5);
when targets exist the answer shows logged-vs-target context, and the prose mirrors the user's
language while DB fields and structural content stay English (invariant #6). The aggregate is
always scoped to the asking user via the tenancy helper (invariant #8).

## Requirements

### Requirement: Answer a nutrition question from the database, not chat history

When the router classifies an inbound message as `query`, the system SHALL answer by aggregating the
user's `food_log` rows in SQL for the router-resolved date (user timezone, including a
`вчера`/`yesterday` override) and SHALL NOT reconstruct the answer from chat history (invariant #1).

#### Scenario: A protein question is answered from the day's logged rows

- **WHEN** a user who has logged food today sends "сколько белка сегодня?"
- **THEN** the reply states today's total protein computed from a `food_log` SUM for that user and date
- **AND** no chat-history context is used to produce the number

#### Scenario: A back-dated question targets the router's resolved date

- **WHEN** a user sends "сколько калорий было вчера?"
- **THEN** the totals are aggregated for yesterday's local date (the router's resolved date), not today

### Requirement: Totals come from the SUM, computed in code

The system SHALL compute every reported total with a single tenant-scoped SQL aggregate
(`_sum` of `kcal`, `protein_g`, `fat_g`, `carbs_g`) over the day's `food_log` rows. The model SHALL
NOT emit the numbers, and the totals SHALL NOT be hand-summed in application code by reducing fetched
rows (invariant #2).

#### Scenario: The reported total equals the SQL SUM of the day's rows

- **WHEN** the day has rows of 40 g and 31 g protein
- **THEN** the answer reports 71 g protein, taken from the aggregate `_sum`, not from summing rows in code

#### Scenario: A day with no entries answers honestly, not zero

- **WHEN** a user asks about a date on which nothing was logged
- **THEN** the reply states that nothing was logged for that date, rather than reporting `0` as if it
  were a measured intake

### Requirement: The asked nutrient is resolved in code

The system SHALL determine which nutrient(s) the question asks about with a deterministic keyword
parser over RU/UA/EN synonyms (protein, calories/kcal, fat, carbs); it SHALL issue no LLM call
(invariant #5). A question that names no specific nutrient SHALL return the full breakdown of all four.

#### Scenario: A specific nutrient question answers only that nutrient

- **WHEN** a user asks "сколько жира сегодня?"
- **THEN** the answer reports the day's fat total (other nutrients need not be included)

#### Scenario: A non-specific question returns the full breakdown

- **WHEN** a user asks "что по сегодня?" with no nutrient named
- **THEN** the answer reports kcal, protein, fat, and carbs for the day

### Requirement: Answer shows goal context when targets exist

When the user has onboarding targets (`users.target_*`), the answer SHALL present each reported
nutrient as the logged amount against its target with the remaining amount; when a target is absent,
the answer SHALL present the bare total. The numbers SHALL be code-rendered from the SUM and the
targets, and the prose SHALL mirror the user's language (invariant #6).

#### Scenario: Logged-of-goal is shown when a target is set

- **WHEN** a user with a 160 g protein target has logged 120 g and asks for protein
- **THEN** the answer shows 120 of 160 g and 40 g remaining

#### Scenario: Bare total is shown when no target is set

- **WHEN** a user with no protein target asks for protein
- **THEN** the answer shows the logged protein total with no goal/remaining figures

### Requirement: The aggregate is tenant-scoped

The system SHALL resolve the acting user from the message's Telegram `chat_id` and SHALL aggregate only
that user's `food_log` rows, through the tenancy helper so the filter is never omitted (invariant #8).

#### Scenario: Only the asking user's rows are aggregated

- **WHEN** a user with `chat_id` C (mapped to user id U) asks a nutrition question
- **THEN** the SUM is computed over `food_log` rows with `user_id = U` only, never another user's rows

### Requirement: Prose mirrors the user's language; structure stays English

The answer prose SHALL mirror the user's message language (RU/UA/EN/mixed) while any structural content
and the stored field names remain English (invariant #6).

#### Scenario: Russian question gets a Russian answer

- **WHEN** a user asks in Russian
- **THEN** the reply prose is Russian while the underlying fields (`protein_g`, `kcal`, …) stay English
