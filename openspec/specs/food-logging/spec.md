# food-logging

## Purpose

Text food logging (US-2): when the router classifies an inbound message as `log`, the system parses
the food, resolves its macros (Food Database match = `fact`; a miss = an honest `estimate` from one
structured LLM call), scales quantities in code, infers the meal from the user's clock, and writes a
single tenant-scoped `food_log` row for the router's resolved date. Confirmation prose mirrors the
user's language while DB fields, enums, and the `source`/`meal` literals stay English. No agent loop;
totals are never hand-summed (invariants #1, #2, #3, #5, #6, #8).

## Requirements

### Requirement: Log a food entry from a text message

When the router classifies an inbound message as `log`, the system SHALL resolve the food's macros
and then, per the precision-first policy, either **write one `food_log` row scoped to the user and
confirm it**, or **defer the write to a clarification** when a hidden high-leverage calorie-mover is
ambiguous (see the `open-question-clarification` capability). When the input is already complete (a
clean Food-Database match or complete text), the system SHALL log directly with no question, exactly
as before. Whenever the entry is written — directly, on a resolved answer, or on the expiry fallback —
it SHALL be recorded for the date the router resolved (user timezone, including a `вчера`/`yesterday`
back-date), not the message-arrival date when an override is present.

#### Scenario: Single text item is logged for the resolved date

- **WHEN** a user sends "200г куриного филе" with no time reference
- **THEN** a `food_log` row is inserted for the user's current local date with `entry_name`,
  `qty`, `unit`, `meal`, computed `kcal`/`protein_g`/`fat_g`/`carbs_g`, and a `source` tag
- **AND** the confirmation reply names the entry and its numbers

#### Scenario: Back-dated entry honors the router's resolved date

- **WHEN** a user sends "вчера съел 2 банана"
- **THEN** the `food_log` row's `date` is yesterday's local date (the router's resolved date),
  not today

#### Scenario: Hidden high-leverage unknown defers the write to a clarification

- **WHEN** a `log` message hides a high-leverage calorie-mover (e.g. "творог" of unstated fat%)
- **THEN** the system does NOT immediately write the `food_log` row — it raises one clarifying
  question (per `open-question-clarification`), and the row is written only once the answer resolves
  it or the question expires to an estimate fallback

### Requirement: Food Database match is a fact; a miss is an estimate

The system SHALL look up the parsed product in the Food Database scoped to the user's own rows
plus the global catalog (`user_id IS NULL`). A match SHALL tag the entry `source = fact` with
macros derived from the matched row. A miss SHALL produce macros from a single structured LLM
call and tag the entry `source = estimate` (±20–30%), surfaced honestly in the confirmation.
The `source` literal SHALL remain English regardless of the user's language.

#### Scenario: Catalog match tags the entry as fact

- **WHEN** the parsed product matches a `food_database` row (own or global catalog)
- **THEN** the entry's `source` is `fact`, `food_db_id` references the matched row, and the macros
  derive from that row's base values

#### Scenario: No match falls back to an honest estimate

- **WHEN** the parsed product matches no `food_database` row
- **THEN** exactly one structured LLM call resolves base macros, the entry's `source` is
  `estimate`, `food_db_id` is null, and the confirmation states the numbers are an estimate

#### Scenario: Estimate path uses exactly one model call with no agent loop

- **WHEN** the estimate path runs
- **THEN** it issues a single `parseStructured` call through the shared cached system prefix and
  performs no tool-call/agent loop (invariant #5)

### Requirement: Quantities are scaled in code, never by the model

The system SHALL compute every `food_log` macro/kcal value in code as `base × factor`, where the
factor is derived deterministically from the entry's quantity and unit against the base `per`
basis. The model SHALL never emit the final per-entry numbers. A `food_log` row's numbers are its
own values and SHALL NOT be produced by summing or re-reading other rows or chat history.

#### Scenario: Per-100g base scales by weight

- **WHEN** a base is `per100g` (kcal 165, protein 31g, fat 3.6g, carbs 0g) and the entry is 200 g
- **THEN** the row stores kcal 330 and protein 62 g (base × 200/100), computed in code

#### Scenario: Per-piece base scales by count

- **WHEN** a base is `piece` (per-egg) and the entry is "2 яйца"
- **THEN** the row stores 2 × the per-piece base, computed in code

#### Scenario: Confirmation never hand-sums a daily total

- **WHEN** an entry is confirmed
- **THEN** the reply shows only that entry's own numbers and no running daily total (daily SUM is
  the `query` capability, invariant #2)

### Requirement: Meal is inferred deterministically from the user's clock

When the message does not specify a meal, the system SHALL infer the `meal` enum from the user's
local time of day in code (no LLM call). The `meal` value SHALL be an English enum literal.

#### Scenario: Time of day maps to a meal

- **WHEN** an entry is logged at the user's local 13:00 with no meal specified
- **THEN** the row's `meal` is `lunch`

### Requirement: Every entry is tenant-scoped

The system SHALL set `user_id` on every `food_log` row and resolve it from the message's Telegram
`chat_id` through the service layer. Reads and writes SHALL go through the tenancy helpers so the
filter is never omitted (invariant #8).

#### Scenario: Entry carries the acting user's id

- **WHEN** a user with `chat_id` C (mapped to user id U) logs food
- **THEN** the inserted `food_log` row has `user_id = U`

#### Scenario: Food DB lookup is scoped to the tenant plus the global catalog

- **WHEN** the product is looked up
- **THEN** the query matches only the user's own `food_database` rows and global rows
  (`user_id IS NULL`), never another user's rows

### Requirement: Offer to save an estimate to the user's Food Database

On the estimate path, the confirmation SHALL offer an inline-keyboard button to persist the
resolved base macros as a `food_database` row owned by the user. Tapping it SHALL insert one row
with `user_id` set and the base `per` + macros. The callback data SHALL be namespaced distinctly
from onboarding's `onb:` prefix.

#### Scenario: Tapping the button persists a user-owned catalog row

- **WHEN** a user taps "add to Food DB" on an estimate confirmation
- **THEN** a `food_database` row is inserted with `user_id` = the acting user, the resolved `per`
  basis, and the base macros, so a future log of the same product matches as `fact`

#### Scenario: Fact-path confirmations do not offer the button

- **WHEN** an entry was resolved from a Food Database match (`source = fact`)
- **THEN** no add-to-Food-DB button is shown (it is already in the catalog)

### Requirement: Prose mirrors the user's language; structure stays English

Confirmation prose SHALL mirror the user's message language (RU/UA/EN/mixed). DB fields, enum
values, and the `source`/`meal` literals SHALL remain English (invariant #6).

#### Scenario: Russian message gets Russian confirmation with English enums

- **WHEN** a user logs food in Russian
- **THEN** the reply prose is Russian while the stored `meal` and `source` values are English
  literals (e.g. `lunch`, `estimate`)
