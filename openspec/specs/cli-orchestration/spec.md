# cli-orchestration Specification

## Purpose
TBD - created by archiving change add-cli-orchestration. Update Purpose after archive.
## Requirements
### Requirement: Single explicit plan-file argument
The system SHALL accept exactly one command-line argument: the plan file
path. Any other argument count (zero, or more than one) SHALL be treated
as a fatal usage error before any file is read or any network call is
made.

#### Scenario: Missing argument is a fatal usage error
- **WHEN** the program is invoked with zero arguments
- **THEN** it prints a usage error and exits with the fatal exit code,
  without attempting to read any file

#### Scenario: Extra arguments are a fatal usage error
- **WHEN** the program is invoked with more than one argument
- **THEN** it prints a usage error and exits with the fatal exit code,
  without attempting to read any file

### Requirement: Parse-before-fetch ordering with no output on a fatal precondition
The system SHALL fully parse and validate the plan before making the
`client-info` fetch call. On any fatal precondition — a bad argument
count, an unreadable plan file, or a fetch failure — no stdout table
SHALL be produced.

#### Scenario: Unreadable plan file is fatal before any fetch
- **WHEN** the given plan file path cannot be opened
- **THEN** the system exits with the fatal exit code, prints a fatal
  message, and makes no `client-info` request

#### Scenario: A plan with zero valid entries is fatal
- **WHEN** the plan file parses without a read error but yields zero
  valid entries
- **THEN** the system prints any parse-level warnings that explain why,
  then a fatal message, exits with the fatal exit code, and makes no
  `client-info` request

#### Scenario: No stdout table on any fatal precondition
- **WHEN** any fatal precondition occurs (bad argument count, unreadable
  plan, zero valid entries, or a fetch failure)
- **THEN** stdout contains no jar table and no total line

### Requirement: Single fetch call per run
The system SHALL invoke the jar fetcher at most once per run.

#### Scenario: Exactly one fetch call when the plan has valid entries
- **WHEN** the plan parses with at least one valid entry
- **THEN** the system calls the jar fetcher exactly once, regardless of
  how many entries the plan contains

### Requirement: Distinct fatal message per fetch failure, no retry
The system SHALL translate each of the fetch layer's fatal conditions
(missing token, invalid/expired token, rate-limited, unreachable) into
one distinct fatal stderr message, and SHALL NOT automatically retry the
fetch call after any of them.

#### Scenario: Each fetch failure condition prints a distinct message
- **WHEN** the fetch call fails with a given fatal condition
- **THEN** the system prints a fatal message specific to that condition,
  distinguishable from the message for any other condition

#### Scenario: Rate-limited failure advises a retry interval
- **WHEN** the fetch call fails because the endpoint is rate-limited
- **THEN** the fatal message advises retrying after approximately 60
  seconds

#### Scenario: No automatic retry after a fetch failure
- **WHEN** the fetch call fails with any fatal condition
- **THEN** the system does not call the fetcher again during the same run

### Requirement: Three-tier exit code contract
The system SHALL exit `0` when every plan entry was matched and emitted
with no warnings of any kind; `1` when at least one link was emitted but
one or more plan entries were skipped (parse-level or match-level); and
`2` when nothing is resolvable — a fatal precondition, a fetch failure,
or zero of the plan's entries matching a jar.

#### Scenario: All matched, no warnings exits zero
- **WHEN** every plan entry resolves to exactly one emitted link and no
  parse-level or match-level warning occurs
- **THEN** the system exits `0`

#### Scenario: Partial match exits one
- **WHEN** at least one link is emitted but at least one plan entry was
  skipped, whether by a parse-level or a match-level warning
- **THEN** the system exits `1`

#### Scenario: Zero of N matched exits two even though the fetch succeeded
- **WHEN** the fetch call succeeds but none of the plan's entries match
  any jar
- **THEN** the system still renders the (empty) table and every warning,
  then exits `2`

#### Scenario: Any fatal precondition or fetch failure exits two
- **WHEN** a fatal precondition or a fetch failure occurs
- **THEN** the system exits `2`

