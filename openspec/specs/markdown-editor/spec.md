# markdown-editor

## Purpose

Formatting toolbar, keyboard shortcuts, and sanitized Markdown rendering for note content.
Covers UI-002 and SEC-004.

## Requirements

### Requirement: Formatting toolbar (UI-002)
The note editor SHALL provide a formatting toolbar with controls for Heading 1, Heading 2,
bullet list, numbered list, checklist, and code, each inserting the corresponding Markdown
syntax at the current cursor position or selection.

#### Scenario: Applying a heading
- **WHEN** an authenticated user places the cursor on a line and activates the Heading 1 (or
  Heading 2) toolbar control
- **THEN** the corresponding Markdown heading prefix (`# ` or `## `) is applied to that line

#### Scenario: Applying a list or checklist
- **WHEN** an authenticated user places the cursor on a line and activates the bullet list,
  numbered list, or checklist toolbar control
- **THEN** the corresponding Markdown list prefix (`- `, `1. `, or `- [ ] `) is applied to that
  line

#### Scenario: Applying code formatting
- **WHEN** an authenticated user selects text and activates the code toolbar control
- **THEN** a single-line, non-empty selection is wrapped in inline backticks, and an empty or
  multi-line selection is wrapped in a fenced code block

### Requirement: Editor keyboard shortcuts (UI-002)
The note editor SHALL provide a keyboard shortcut for each formatting toolbar action, usable
without the mouse.

#### Scenario: Keyboard shortcut applies the same formatting as its toolbar control
- **WHEN** an authenticated user presses the keyboard shortcut bound to a formatting action
  (heading, list, checklist, or code)
- **THEN** the same Markdown syntax is applied as if the corresponding toolbar control had
  been activated

### Requirement: Markdown preview
The note editor SHALL provide a way to view the note's current content rendered as HTML,
alongside the raw-Markdown editing view.

#### Scenario: Switching to preview
- **WHEN** an authenticated user switches the editor from Write to Preview
- **THEN** the note's current content (including unsaved edits) is rendered as HTML in place
  of the raw-Markdown textarea

#### Scenario: Switching back to write
- **WHEN** an authenticated user switches the editor from Preview back to Write
- **THEN** the raw-Markdown textarea is shown again with the same content and cursor
  unaffected by the preview render

### Requirement: Sanitize rendered Markdown against XSS (SEC-004)
Any HTML produced by rendering a note's Markdown content SHALL be sanitized against a fixed
allowlist before being inserted into the DOM, both when rendered from previously saved content
on the server and when rendered from in-progress edits on the client.

#### Scenario: Script content is stripped
- **WHEN** a note's content contains a `<script>` tag or any other HTML/Markdown construct
  outside the sanitizer's allowlist
- **THEN** the rendered preview does not include that tag or its executable content

#### Scenario: Server-rendered preview is sanitized
- **WHEN** a note's saved content is rendered as HTML for the initial page load
- **THEN** the resulting HTML has passed through server-side sanitization before being sent to
  the client

#### Scenario: Client-rendered live preview is sanitized
- **WHEN** a note's in-progress (unsaved) content is rendered as HTML in the browser without a
  server round trip
- **THEN** the resulting HTML has passed through client-side sanitization before being
  inserted into the DOM

#### Scenario: Unsupported formatting is not rendered
- **WHEN** a note's content contains Markdown syntax for formatting outside the toolbar's six
  supported actions (e.g. bold, links, images, tables)
- **THEN** the rendered preview does not render that syntax as HTML formatting (it is shown as
  plain text or omitted, per the sanitizer allowlist)
