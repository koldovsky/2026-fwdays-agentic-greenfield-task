# plan-parsing

## Purpose

Parses and validates a user-authored `plan.txt` file into an ordered list of
jar-name/amount entries. Applies the `<amount> - <jar name>` grammar, comment and
whitespace handling, positive-whole-UAH amount validation, and
malformed/duplicate-line detection rules from the product requirements
(FR-INPUT-01/02, FR-PARSE-01/02, FR-AMOUNT-01, FR-MALFORMED-01, FR-DUP-01).
This capability is pure and offline — it does not read `MONO_TOKEN`, call
monobank, or expose the `jarsplit` binary. Downstream capabilities
(`jar-matching`, `cli-orchestration`) consume its output.
## Requirements
### Requirement: Read plan from an explicit file path
The system SHALL read the plan from a single explicit file-path argument. A
missing or unreadable path SHALL be treated as a fatal error, distinct from
per-line warnings.

#### Scenario: Valid file path is read
- **WHEN** the given path points to a readable plan file
- **THEN** its contents are read and passed to line parsing

#### Scenario: Missing file path is a fatal error
- **WHEN** the given path does not exist
- **THEN** parsing returns a fatal error and no entries or warnings are produced

#### Scenario: Unreadable file path is a fatal error
- **WHEN** the given path exists but cannot be read (e.g. permission denied)
- **THEN** parsing returns a fatal error and no entries or warnings are produced

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

### Requirement: Blank line handling
Blank and whitespace-only lines SHALL be skipped silently, without producing
a warning.

#### Scenario: Blank and whitespace-only lines are skipped silently
- **WHEN** the plan contains an empty line and a line of only spaces/tabs
- **THEN** neither line produces an entry or a warning

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

### Requirement: Deterministic plan order
Valid entries SHALL be returned in the order they appear in the plan file,
with no reordering, so downstream stages produce stable, deterministic
output.

#### Scenario: Valid entries preserve file order
- **WHEN** the plan lists `Заощадження`, then `Подорожі`, then `Подушка`
- **THEN** the returned entries appear in that same order

