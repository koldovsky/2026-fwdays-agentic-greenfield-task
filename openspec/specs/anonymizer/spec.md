# anonymizer Specification

## Purpose

Defines the framework-free anonymizer that builds a stable per-export alias map from a ticket's known name fields and replaces those names across all text and file-name surfaces, so exported Markdown and media never expose real identities by default (FR-19–FR-21, NFR-07).

## Requirements

### Requirement: Build a Consistent Alias Map from Structured Name Fields
The anonymizer SHALL collect known real names from a ticket's `assignee`, `reporter`, and comment `author` fields (in that order, first occurrence wins), and SHALL also treat a person-shaped `title` (e.g. "First Last") as a known name when no assignee/reporter supplies it, assigning each unique name a stable `UserN` alias starting at `User1`.

#### Scenario: Assignee and reporter are different people
- **WHEN** a ticket has a distinct assignee and reporter
- **THEN** the assignee is mapped to `User1` and the reporter to `User2`

#### Scenario: Same person in multiple roles
- **WHEN** a ticket's assignee and reporter are the same name, or a comment author matches an existing name
- **THEN** that name maps to a single alias, reused everywhere it appears

#### Scenario: No known names
- **WHEN** a ticket has no assignee, no reporter, and no comment authors
- **THEN** the alias map is empty and the ticket is returned unchanged

### Requirement: Replace Names Across All Text and File-Name Surfaces
The anonymizer SHALL replace every occurrence of a known name with its alias in: the ticket `title`, the `assignee` and `reporter` fields, each comment's `author` and `body`, each description block's text content, and each attachment's `name`.

#### Scenario: Name appears in the ticket title
- **WHEN** the ticket `title` contains a known person's full name
- **THEN** the anonymized ticket's `title` has that name replaced with the person's alias

#### Scenario: Name appears in a comment body
- **WHEN** a comment's `body` contains the reporter's full name
- **THEN** the anonymized comment's `body` has that name replaced with the reporter's alias

#### Scenario: Name appears in an attachment file name
- **WHEN** an attachment's `name` contains a known person's full name verbatim (e.g. `"Federico Ciner - screenshot.png"`, matched as the whole "first last" phrase — not name fragments joined by hyphens/underscores)
- **THEN** the anonymized attachment's `name` has that name replaced with the person's alias, leaving the `url` untouched

#### Scenario: Name appears in description text
- **WHEN** a description paragraph block's text contains a known name
- **THEN** the anonymized block's text has that name replaced with the alias, and non-name text is unchanged

### Requirement: Longest-Name-First Replacement Avoids Partial-Match Corruption
When one known name is a substring of another (e.g. "Ana" within "Ana Maria"), the anonymizer SHALL replace the longer name first so the shorter name's alias does not corrupt occurrences of the longer name.

#### Scenario: Overlapping names
- **WHEN** the known names include both "Ana" and "Ana Maria"
- **THEN** an occurrence of "Ana Maria" in text is replaced as a whole with Ana Maria's alias, not partially replaced using Ana's alias

### Requirement: Anonymization Returns a New Ticket, Never Mutates the Input
The anonymizer SHALL return a new `ParsedTicket` object reflecting the replacements, without mutating the ticket object passed in.

#### Scenario: Original ticket is unchanged after anonymization
- **WHEN** `anonymizeTicket` is called with a ticket containing known names
- **THEN** the original ticket object's fields still contain the original, non-anonymized names after the call returns
