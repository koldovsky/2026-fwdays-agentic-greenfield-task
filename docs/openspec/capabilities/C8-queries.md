# C8 — Queries & Aggregation

**OpenSpec change:** `add-queries`
**Owner:** `lib/content/queries.ts`, `lib/content/index-data.ts`
**Depends on:** C4 (Book Store), C5 (Note Store), C6 (Links & Backlinks)
**Maps to:** requirements.md §3.1 (grouping), §3.3 (link targets), §3.4 (backlink load)

## Purpose
Read-side aggregation across the whole library: group books into shelves by tag, load
the backlink index from disk, and build the list of link targets for the LinkPicker.

## Requirements

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
