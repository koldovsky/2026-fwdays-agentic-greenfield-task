## ADDED Requirements

### Requirement: Rest interval input

The application SHALL provide a numeric input for the desired distance between rest stops, measured in kilometers.

#### Scenario: Integer kilometers only

- **WHEN** the visitor enters a rest interval value
- **THEN** only whole-number kilometer values within the allowed range are accepted
- **THEN** non-numeric input is rejected or stripped

#### Scenario: Out-of-range rest interval

- **WHEN** the visitor enters a rest interval outside the allowed range
- **THEN** a calm Ukrainian validation message is shown below the field
- **THEN** the form cannot be submitted while the value is invalid

### Requirement: Maximum daily distance input

The application SHALL provide a numeric input for the maximum total riding distance per day, measured in kilometers.

#### Scenario: Integer kilometers only

- **WHEN** the visitor enters a daily limit value
- **THEN** only whole-number kilometer values within the allowed range are accepted
- **THEN** non-numeric input is rejected or stripped

#### Scenario: Out-of-range daily limit

- **WHEN** the visitor enters a daily limit outside the allowed range
- **THEN** a calm Ukrainian validation message is shown below the field
- **THEN** the form cannot be submitted while the value is invalid

### Requirement: Default constraint values

When URL parameters or user input do not specify constraints, the application MUST apply sensible default values for rest interval and daily limit.

#### Scenario: Defaults on first visit

- **WHEN** the visitor loads the page without `rest` or `day` query parameters
- **THEN** the numeric fields display documented default kilometer values
