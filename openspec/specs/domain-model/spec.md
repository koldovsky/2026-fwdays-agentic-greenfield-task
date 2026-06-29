# domain-model Specification

## Purpose
Shared types (Book, Note, statuses, cover colors) and the 8-highlighter color set with meanings.
## Requirements
### Requirement: Typed book and note shapes
The system SHALL define `Book`/`BookMeta` and `Note` types matching the on-disk
frontmatter. A book carries title, author, optional cover or coverColor, status,
optional dateRead, optional rating, tags, and optional summary (plus slug, body, and a
`malformed` flag). A note carries id, color, optional excerpt, optional page, links, and
a markdown body.

#### Scenario: Book status is constrained
- **WHEN** a value is typed as `BookStatus`
- **THEN** it is exactly one of `reading`, `finished`, or `toread`

#### Scenario: Cover color is constrained
- **WHEN** a value is typed as `CoverColor`
- **THEN** it is one of `blue`, `coral`, `teal`, `purple`, `amber`, `green`, or `ink`

### Requirement: Highlighter color set with meanings
The system SHALL define exactly 8 `HighlighterKey` colors — yellow, amber, coral, pink,
purple, blue, teal, green — each paired with an English label/meaning, and SHALL expose
the default color `yellow`.

#### Scenario: Eight colors with labels
- **WHEN** reading the note color set
- **THEN** it contains exactly 8 entries, each with a `value` and a non-empty English `label`

#### Scenario: Default color
- **WHEN** no color is chosen
- **THEN** the default is `yellow`

### Requirement: Color validation guard
The system SHALL provide a guard that reports whether a string is a valid highlighter color.

#### Scenario: Known color
- **WHEN** checking `"green"`
- **THEN** the guard returns true

#### Scenario: Unknown color
- **WHEN** checking an unrecognized string (e.g. `"chartreuse"`)
- **THEN** the guard returns false

