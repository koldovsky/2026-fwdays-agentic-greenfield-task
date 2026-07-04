## ADDED Requirements

### Requirement: Four-metric input parsing

The system SHALL parse a single text message into four numeric values: weight (kg),
body fat (%), muscle (%), and BMI. (FR-LOG-01)

#### Scenario: Space-separated input

- **WHEN** the user sends `72,4 28,5 32,1 24,8`
- **THEN** the parser returns weight `72.4`, fat `28.5`, muscle `32.1`, bmi `24.8`

#### Scenario: Newline-separated input

- **WHEN** the user sends four numbers separated by newlines
- **THEN** the parser returns all four values correctly

#### Scenario: Input is trimmed

- **WHEN** the user sends leading or trailing whitespace around four numbers
- **THEN** the parser trims and parses successfully (FR-LOG-02)

### Requirement: Decimal separator normalization

The parser SHALL accept both `.` and `,` as decimal separators and normalize internally
to float values. (FR-LOG-03)

#### Scenario: Comma decimals

- **WHEN** the user sends `72,4 28,5 32,1 24,8`
- **THEN** all values are parsed as floats with fractional parts

#### Scenario: Dot decimals

- **WHEN** the user sends `72.4 28.5 32.1 24.8`
- **THEN** all values are parsed as floats with fractional parts

### Requirement: Invalid input rejection

The parser SHALL raise a distinguishable error when the input does not contain exactly
four valid numbers. (FR-LOG-04)

#### Scenario: Wrong token count

- **WHEN** the user sends fewer or more than four numbers
- **THEN** parsing fails with a parse error

#### Scenario: Non-numeric tokens

- **WHEN** the user sends text that is not four numbers
- **THEN** parsing fails with a parse error
