# C3 — Slug

**OpenSpec change:** `add-slug`
**Owner:** `lib/content/slug.ts`
**Depends on:** — (foundation)
**Maps to:** requirements.md §7.5 (slug decision)

## Purpose
Turn a book title into a stable, URL-safe folder slug, transliterating Ukrainian
Cyrillic to Latin. The result is editable by the user before saving (C13).

## Requirements

### Requirement: Title to slug
The system SHALL lowercase, transliterate Ukrainian Cyrillic to Latin, replace runs of
non-alphanumerics with a single dash, and trim leading/trailing dashes.

#### Scenario: ASCII title
- **WHEN** slugifying "Atomic Habits"
- **THEN** the result is `atomic-habits`

#### Scenario: Ukrainian title
- **WHEN** slugifying "Глибока робота"
- **THEN** the result is a Latin slug (e.g. `hlyboka-robota`)

### Requirement: Non-empty fallback
The system SHALL return `book` when the input has no usable characters.

#### Scenario: Symbols-only input
- **WHEN** slugifying "!!!" or ""
- **THEN** the result is `book`
