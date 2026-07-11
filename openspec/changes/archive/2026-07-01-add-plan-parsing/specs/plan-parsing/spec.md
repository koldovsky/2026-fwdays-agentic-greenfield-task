## ADDED Requirements

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
Each data line SHALL follow the grammar `Name = amount`, with the name and
the amount both trimmed of surrounding whitespace. The separator SHALL be
`=`.

#### Scenario: Name and amount are trimmed of surrounding whitespace
- **WHEN** a line reads `  Заощадження   =   5000  `
- **THEN** the parsed entry has name `Заощадження` and amount `5000`

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
- **WHEN** a line reads `Заощ. = 5000 # note`
- **THEN** the parsed entry has name `Заощ.` and amount `5000`

#### Scenario: `#` adjacent to non-space text is treated as literal
- **WHEN** a line reads `C#фонд = 100`
- **THEN** the parsed entry has name `C#фонд` and amount `100`

### Requirement: Amount validation
The amount SHALL be a positive whole-UAH integer (`> 0`). Decimals, zero,
negative values, and digit separators (`_`, `,`) SHALL make the line
malformed.

#### Scenario: Positive whole integer is valid
- **WHEN** a line reads `Подорожі = 3000`
- **THEN** the parsed entry has amount `3000`

#### Scenario: Zero amount is malformed
- **WHEN** a line reads `Подушка = 0`
- **THEN** the line is skipped as malformed

#### Scenario: Negative amount is malformed
- **WHEN** a line reads `Подушка = -100`
- **THEN** the line is skipped as malformed

#### Scenario: Decimal amount is malformed
- **WHEN** a line reads `Подушка = 100.50`
- **THEN** the line is skipped as malformed

#### Scenario: Digit-separator amount is malformed
- **WHEN** a line reads `Подушка = 1_000` or `Подушка = 1,000`
- **THEN** the line is skipped as malformed

### Requirement: Malformed line handling
A structurally malformed line (no `=`, empty name, or invalid amount) SHALL
be skipped with a warning that includes the line number. Remaining valid
lines SHALL still be processed.

#### Scenario: Line without `=` is skipped with a warning
- **WHEN** a data line contains no `=` separator
- **THEN** the line is skipped and a warning referencing its line number is produced

#### Scenario: Line with empty name is skipped with a warning
- **WHEN** a line reads `= 5000`
- **THEN** the line is skipped and a warning referencing its line number is produced

#### Scenario: Malformed line does not block remaining valid lines
- **WHEN** the plan contains a malformed line followed by a valid line
- **THEN** the valid line still produces an entry

### Requirement: Duplicate jar name handling
If the same jar name appears on more than one plan line, that name SHALL be
skipped entirely with a warning listing the offending line numbers.
Amounts for a duplicated name SHALL never be summed or replaced.

#### Scenario: Same name on multiple lines is skipped for all occurrences
- **WHEN** the plan contains `Заощадження = 5000` on line 1 and
  `Заощадження = 2000` on line 3
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
