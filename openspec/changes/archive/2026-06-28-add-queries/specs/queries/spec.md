# Queries & Aggregation

## ADDED Requirements

### Requirement: Group books by tag
The system SHALL group books into one shelf per distinct tag (alphabetical); a
multi-tag book appears under each tag; untagged books group under `Untagged`.

#### Scenario: Multi-tag book
- **WHEN** a book has tags `x` and `y`
- **THEN** it appears in both the `x` and `y` shelves

#### Scenario: Untagged book
- **WHEN** a book has no tags
- **THEN** it appears under `Untagged`

### Requirement: Load backlink index from disk
The system SHALL read all books and their notes and build the C6 backlink index.

#### Scenario: Cross-book backlink
- **WHEN** a note in book A links to book B
- **THEN** the loaded index maps `book:B` to that source

### Requirement: Link targets for the picker
The system SHALL list every book and note as a selectable link target (value + label).

#### Scenario: Targets include books and notes
- **WHEN** building targets
- **THEN** each book yields a `book:` target and each note a `note:` target
