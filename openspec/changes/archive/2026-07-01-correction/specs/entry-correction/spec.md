## ADDED Requirements

### Requirement: Correct the user's most recent food entry

When the router classifies an inbound message as `correction`, the system SHALL update the acting
user's most recent `food_log` row in place (same row `id`) — never insert a new row — and confirm
the corrected value. "Most recent" SHALL be the user's `food_log` row with the highest `id`
(latest insert), resolved through the tenancy layer so another user's rows can never be touched.

#### Scenario: Quantity-only correction rescales the last entry in place

- **WHEN** a user's last entry is "200г куриного филе" (330 kcal) and they send "нет, 300 не 200"
- **THEN** the same `food_log` row (same `id`) is updated to `qty = 300` with macros rescaled in
  code from the entry's own basis (495 kcal), and no new row is inserted

#### Scenario: Product correction re-resolves and updates the last entry

- **WHEN** a user's last entry is "200г куриного филе" and they send "нет, это была говядина"
- **THEN** the same `food_log` row is re-resolved through the food pipeline (Food DB match → `fact`,
  miss → one structured LLM `estimate`), updating `entry_name`, `source`, `food_db_id`, `qty`,
  `unit`, and macros, with no new row inserted

#### Scenario: Nothing to correct when the user has no entries

- **WHEN** a user with no `food_log` rows sends a `correction` message
- **THEN** no row is written and the reply honestly states there is nothing to correct yet

### Requirement: Corrected numbers are computed in code, never by the model

The system SHALL compute every corrected macro/kcal value in code as `base × factor`, exactly like
the logging path (invariant #2). On a quantity-only correction the basis SHALL be recovered from
the existing row and rescaled to the new quantity; the model SHALL never emit the corrected
per-entry numbers. A quantity-only correction SHALL issue **zero** LLM calls; a product correction
SHALL issue **at most one** structured LLM call (the existing estimate path) and run no agent loop
(invariant #5).

#### Scenario: Quantity rescale is code-computed and driftless to the basis

- **WHEN** a per-100g entry of 200 g (protein 62 g) is corrected to 300 g
- **THEN** the stored protein is 93 g, computed in code from the recovered per-100g basis, not by
  the model

#### Scenario: Quantity-only correction makes no LLM call

- **WHEN** a correction changes only the quantity of the last entry
- **THEN** the system performs the update with no Anthropic call and no agent/tool loop

### Requirement: Correction is tenant-scoped

The system SHALL resolve the acting user from the message's Telegram `chat_id` and both read the
last entry and write the update through the tenancy helpers, so the `user_id` filter is never
omitted (invariant #8).

#### Scenario: Correction never touches another user's entry

- **WHEN** user U sends a correction and the globally-most-recent `food_log` row belongs to a
  different user V
- **THEN** U's own most recent row is corrected and V's row is left unchanged

### Requirement: Confirmation reflects the corrected value in the user's language

The confirmation reply SHALL state the corrected entry's own numbers (kcal and macros) and mirror
the user's message language (RU/UA/EN/mixed). DB fields, enum values, and the `source`/`meal`
literals SHALL remain English (invariant #6). The reply SHALL show only the corrected entry's own
figures, never a hand-summed daily total (that is the `query` capability, invariant #2).

#### Scenario: Russian correction gets a Russian confirmation with English enums

- **WHEN** a user corrects an entry in Russian
- **THEN** the reply prose is Russian and reflects the corrected kcal/macros, while the stored
  `meal` and `source` values remain English literals

#### Scenario: Estimate after a product correction is surfaced honestly

- **WHEN** a product correction re-resolves to a Food DB miss (`source = estimate`)
- **THEN** the confirmation states the corrected numbers are an estimate, consistent with the
  logging path
