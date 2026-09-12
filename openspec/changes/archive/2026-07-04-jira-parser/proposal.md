## Why

The extension has no way to turn a Jira ticket page into structured data yet — `app/src/lib/` is an empty placeholder. Every downstream change (Markdown serializer, anonymizer, popup wiring) needs a typed, in-memory representation of a ticket to work with, so the DOM parser is the first `lib/` piece to build.

## What Changes

- Add a framework-free Jira DOM parser in `app/src/lib/jira-parser/` that takes a `Document` (or `Element` root) and returns a structured `ParsedTicket` object: key, title, type, status, resolution, components, description (HTML→structured blocks), people (assignee/reporter), dates (created/updated), comments, and attachments.
- Parser reads directly from the DOM — no `fetch`, no tracker REST calls, no Chrome APIs (FR-02, NFR-07).
- Missing/absent fields (e.g. no priority, no labels, no attachments, no comments) are represented as empty/undefined rather than throwing — the real `examples/` fixture (ROVODEV-36) itself has no priority-val, labels-val, or attachment elements, so this is the common case, not an edge case.
- Unit tests (Vitest) against the static `examples/[ROVODEV-36]...html` fixture using `jsdom` (or Vitest's built-in `happy-dom`/`jsdom` environment) to parse real markup, supplemented by minimal hand-authored HTML fragments for fields absent from the real fixture (comments, attachments, priority, labels).

Out of scope for this change: Markdown serialization (separate `markdown-serializer` change), anonymization, attachment downloading, Azure DevOps (out of MVP scope per `docs/product-brief.md`).

## Capabilities

### New Capabilities
- `jira-parser`: DOM parsing of a Jira ticket page into a structured, framework-free `ParsedTicket` model, tolerant of missing optional fields.

### Modified Capabilities
(none — `popup-shell` is unaffected by this change)

## Impact

- New directory `app/src/lib/jira-parser/` (parser + type definitions) and `app/src/lib/jira-parser/*.test.ts`.
- New devDependency: a DOM-in-Node environment for Vitest (e.g. `jsdom`) to parse the static HTML fixture in tests.
- No changes to `docs/requirements.md` — implements existing `accepted` requirements FR-01, FR-02, and the parsing portion of FR-10 (full serialization lands in `markdown-serializer`).
