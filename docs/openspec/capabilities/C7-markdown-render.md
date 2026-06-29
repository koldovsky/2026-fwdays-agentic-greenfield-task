# C7 — Markdown Render

**OpenSpec change:** `add-markdown-render`
**Owner:** `lib/markdown.ts`
**Depends on:** C6 (Links & Backlinks)
**Maps to:** requirements.md §3.2 (summary/reflection render), §3.4 (wiki-links)

## Purpose
Render Markdown (summaries, note reflections) to HTML, expanding `[[…]]` wiki-links
into real links before rendering so in-text references become navigation.

## Requirements

### Requirement: Render Markdown to HTML
The system SHALL render standard Markdown to HTML.

#### Scenario: Headings and emphasis
- **WHEN** rendering `# Title` and `**bold**`
- **THEN** the HTML contains an `<h1>` and a `<strong>`

### Requirement: Expand wiki-links
The system SHALL convert `[[book:<slug>]]` and `[[note:<slug>/<id>]]` to anchor links
using the C6 href, and leave malformed `[[…]]` as literal text.

#### Scenario: Book wiki-link
- **WHEN** rendering `See [[book:deep-work]]`
- **THEN** the HTML contains `<a href="/book/deep-work">`

#### Scenario: Malformed wiki-link
- **WHEN** rendering `[[nonsense]]`
- **THEN** the text `[[nonsense]]` is preserved
