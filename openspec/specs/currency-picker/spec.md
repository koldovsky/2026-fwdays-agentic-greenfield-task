# Currency picker / filter

## Purpose
Let the user narrow the currency list by code or Ukrainian name and pick the
active currency, with a calm inline empty result.

## Requirements

### Requirement: Filter the currency list (FR-PICK-01)
A single input SHALL filter the currency list by ISO code or Ukrainian name.

#### Scenario: Filtering by code
- **WHEN** the user types «USD» (or «дол») into the filter
- **THEN** the list narrows to currencies matching that code or name

### Requirement: Inline empty result (FR-PICK-02)
When the filter matches nothing, the system SHALL show an inline «Нічого не
знайдено» message — no toast and no error.

#### Scenario: No match
- **WHEN** the filter text matches no currency
- **THEN** an inline «Нічого не знайдено» message is shown in place of the list

### Requirement: Select from filtered list (FR-PICK-03)
Selecting a currency from the filtered list SHALL set the active currency.

#### Scenario: Picking a filtered currency
- **WHEN** the user selects a currency from the filtered results
- **THEN** that currency becomes the active currency
