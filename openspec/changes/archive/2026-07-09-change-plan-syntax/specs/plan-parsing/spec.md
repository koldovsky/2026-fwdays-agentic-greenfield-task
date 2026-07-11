## MODIFIED Requirements

### Requirement: Plan line grammar
Each data line SHALL follow the grammar `<amount> - <jar name>`, with the amount and
the jar name both trimmed of surrounding whitespace. The separator SHALL be `-`, and
a line SHALL be split on its **first** `-`: the segment before it is the amount and
the entire remainder is the jar name (so a jar name MAY contain `-`).

#### Scenario: Amount and name are trimmed of surrounding whitespace
- **WHEN** a line reads `  5000  -  Заощадження  `
- **THEN** the parsed entry has amount `5000` and name `Заощадження`

#### Scenario: Jar name may contain a hyphen
- **WHEN** a line reads `5000 - новий-рік`
- **THEN** the parsed entry has amount `5000` and name `новий-рік`

### Requirement: Comment handling
A `#` SHALL begin a comment when it is the first non-whitespace character
of a line, or when it is preceded by whitespace (an inline trailing
comment). A `#` adjacent to non-space text SHALL be treated as literal
content, not a comment marker. Comment text from `#` to end-of-line SHALL be
stripped before the rest of the line is parsed.

#### Scenario: Leading `#` comment line is skipped
- **WHEN** a line reads `# this is a note`
- **THEN** the line produces no entry and no warning

#### Scenario: Inline trailing comment after whitespace is stripped
- **WHEN** a line reads `5000 - Заощ. # note`
- **THEN** the parsed entry has amount `5000` and name `Заощ.`

#### Scenario: `#` adjacent to non-space text is treated as literal
- **WHEN** a line reads `100 - C#фонд`
- **THEN** the parsed entry has amount `100` and name `C#фонд`

### Requirement: Amount validation
The amount SHALL be a positive whole-UAH integer (`> 0`). Internal whitespace in the
amount SHALL be stripped before parsing, so a thousands space is accepted (`12 000`
parses as `12000`). Decimals, zero, negative values, and non-whitespace digit
separators (`_`, `,`) SHALL make the line malformed.

#### Scenario: Positive whole integer is valid
- **WHEN** a line reads `3000 - Подорожі`
- **THEN** the parsed entry has amount `3000`

#### Scenario: Amount with an internal space is valid
- **WHEN** a line reads `12 000 - donates`
- **THEN** the parsed entry has amount `12000` and name `donates`

#### Scenario: Zero amount is malformed
- **WHEN** a line reads `0 - Подушка`
- **THEN** the line is skipped as malformed

#### Scenario: Decimal amount is malformed
- **WHEN** a line reads `100.50 - Подушка`
- **THEN** the line is skipped as malformed

#### Scenario: Non-whitespace digit-separator amount is malformed
- **WHEN** a line reads `1_000 - Подушка` or `1,000 - Подушка`
- **THEN** the line is skipped as malformed

### Requirement: Malformed line handling
A structurally malformed line (no `-`, empty name, or invalid amount) SHALL
be skipped with a warning that includes the line number. Remaining valid
lines SHALL still be processed.

#### Scenario: Line without `-` is skipped with a warning
- **WHEN** a data line contains no `-` separator
- **THEN** the line is skipped and a warning referencing its line number is produced

#### Scenario: Old `=` grammar line is skipped with a warning
- **WHEN** a line reads `Заощадження = 5000`
- **THEN** the line is skipped and a warning referencing its line number is produced

#### Scenario: Line with empty name is skipped with a warning
- **WHEN** a line reads `5000 -`
- **THEN** the line is skipped and a warning referencing its line number is produced

#### Scenario: Malformed line does not block remaining valid lines
- **WHEN** the plan contains a malformed line followed by a valid line
- **THEN** the valid line still produces an entry

### Requirement: Duplicate jar name handling
If the same jar name appears on more than one plan line, that name SHALL be
skipped entirely with a warning listing the offending line numbers.
Amounts for a duplicated name SHALL never be summed or replaced.

#### Scenario: Same name on multiple lines is skipped for all occurrences
- **WHEN** the plan contains `5000 - Заощадження` on line 1 and
  `2000 - Заощадження` on line 3
- **THEN** neither line produces an entry

#### Scenario: Duplicate warning lists all offending line numbers
- **WHEN** a jar name is duplicated across lines 1 and 3
- **THEN** the resulting warning references both line 1 and line 3
