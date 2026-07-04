## ADDED Requirements

### Requirement: Name-prefixed supportive messages

When `display_name` is set (non-empty string in `user_settings`), supportive messages SHALL
be prefixed with the name in Ukrainian form (e.g. «Оленка, …»). (FR-MSG-01)

#### Scenario: Named user receives prefixed line

- **WHEN** `display_name` is `Оленка` and a supportive line is selected
- **THEN** the returned text starts with «Оленка, » followed by the line body

### Requirement: General messages without a name

When `display_name` is `NULL` or empty, supportive messages SHALL omit the name prefix and use
general copy. (FR-MSG-02)

#### Scenario: Cleared name omits prefix

- **WHEN** `display_name` is `NULL` and a supportive line is selected
- **THEN** the returned text has no name prefix

### Requirement: Weight-trend supportive line selection

The system SHALL select **one** supportive Ukrainian line based on the weight trend label
(**прогрес**, **коливання**, or **без змін**) derived from weight delta vs the previous entry.
(FR-MSG-03, FR-MSG-04)

#### Scenario: Progress trend selects progress pool

- **WHEN** weight trend is **прогрес**
- **THEN** the selected line comes from the progress message pool

#### Scenario: Fluctuation trend selects fluctuation pool

- **WHEN** weight trend is **коливання**
- **THEN** the selected line is motivating and non-blaming (BC-TONE-01)

#### Scenario: Stable trend selects stable pool

- **WHEN** weight trend is **без змін**
- **THEN** the selected line is motivating and non-blaming (BC-TONE-01)

#### Scenario: No previous entry skips supportive line

- **WHEN** there is no weight delta vs a previous entry (first weigh-in)
- **THEN** no supportive line is produced

### Requirement: Message pool with random selection

Each weight-trend category SHALL have **at least three** Ukrainian message variants. The system
SHALL pick one variant at random per invocation to reduce repetition. (FR-MSG-07)

#### Scenario: Pool size per category

- **WHEN** supportive message pools are defined
- **THEN** progress, fluctuation, and stable categories each contain ≥ 3 variants

#### Scenario: Random pick from pool

- **WHEN** `pick_support_line` is called twice for the same trend with a mocked random source
  returning different indices
- **THEN** different variants can be returned from the same pool

### Requirement: Supportive tone constraints

Supportive copy SHALL avoid shame, medical claims, and the label «регрес». Fluctuation and
stable lines SHALL remain calm and encouraging. (BC-TONE-01, FR-MSG-04)

#### Scenario: No regress label in pools

- **WHEN** any message pool variant is inspected
- **THEN** no variant contains the word «регрес»
