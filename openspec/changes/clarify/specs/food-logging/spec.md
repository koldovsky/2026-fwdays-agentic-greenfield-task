## MODIFIED Requirements

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
