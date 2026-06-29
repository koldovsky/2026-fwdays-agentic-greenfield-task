# markdown-render

## ADDED Requirements

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

#### Scenario: Note wiki-link
- **WHEN** rendering `Compare [[note:deep-work/n-x9]]`
- **THEN** the HTML contains `<a href="/book/deep-work#n-x9">`

#### Scenario: Malformed wiki-link
- **WHEN** rendering `[[nonsense]]`
- **THEN** the text `[[nonsense]]` is preserved
