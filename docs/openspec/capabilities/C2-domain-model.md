# C2 — Domain Model

**OpenSpec change:** `add-domain-model`
**Owner:** `lib/content/types.ts`, `lib/content/colors.ts`
**Depends on:** — (foundation)
**Maps to:** requirements.md §2.2–§2.4

## Purpose
The shared, framework-free vocabulary every other capability speaks: the `Book` and
`Note` shapes, the book status set, cover colors, and the 8 highlighter colors with
their fixed meanings.

## Requirements

### Requirement: Typed book and note shapes
The system SHALL define `Book`/`BookMeta` and `Note` matching the on-disk frontmatter
(book: title, author, cover|coverColor, status, dateRead, rating, tags, summary; note:
id, color, excerpt?, page?, links[], body).

#### Scenario: Status values
- **WHEN** representing a book status
- **THEN** it is one of `reading` | `finished` | `toread`

### Requirement: Highlighter color set with meanings
The system SHALL define the 8 `HighlighterKey` colors (yellow, amber, coral, pink,
purple, blue, teal, green), each with a human label/meaning, defaulting to `yellow`.

#### Scenario: There are exactly 8 colors with labels
- **WHEN** reading the color set
- **THEN** it lists 8 entries, each with a value and an English label

#### Scenario: Validating an unknown color
- **WHEN** checking an unknown color string
- **THEN** the predicate returns false and callers fall back to `yellow`
