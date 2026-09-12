## Why

`jira-parser` produces a structured `ParsedTicket`, but nothing yet turns that into the `.md` file content the extension is meant to produce. This change adds the second `lib/` piece: a framework-free serializer that converts `ParsedTicket` into Markdown text, plus the attachment-naming scheme (`01-`, `02-`, …) the Markdown needs to reference.

## What Changes

- Add `app/src/lib/markdown-serializer/` that converts a `ParsedTicket` into a single Markdown string: title, key, metadata (type/status/resolution/priority/components/labels line), description blocks, people, dates, and comments (FR-10).
- Convert description blocks' inline HTML fragments (links, bold, code spans from the parser's `DescriptionBlock.html`) into proper Markdown inline syntax using `turndown` — a small, framework-free, MIT-licensed HTML→Markdown library (not a UI framework; doesn't conflict with NFR-05's "no UI framework" or NFR-02's "zero paid APIs").
- Add attachment filename planning: given `ParsedTicket.attachments` (DOM order), assign an order-preserving numeric prefix (`01-`, `02-`, …) to each, deduplicating collisions in the resulting name (FR-13).
- The serializer's Markdown output references attachments via their planned `media/<prefix>-<name>` relative path so the exported folder is self-contained (FR-14).
- Unit tests (Vitest) covering: full serialization of a realistic `ParsedTicket` (built from the `jira-parser` output against the `examples/` ROVODEV-36 fixture), attachment numbering/dedup, and inline-HTML-to-Markdown conversion edge cases (links, bold, nested lists).

Out of scope for this change: anonymization (separate `anonymizer` change — this serializer operates on whatever `ParsedTicket` it's given, anonymized or not), actual attachment byte downloads and `chrome.downloads` calls, ticket-level export folder/file naming for `Downloads/<TICKET-ID>/` (FR-15–FR-18 — bundled into `popup-wiring`, since it's about the download orchestration, not Markdown content).

## Capabilities

### New Capabilities
- `markdown-serializer`: converts a `ParsedTicket` into Markdown text and plans attachment filenames, independent of anonymization and of the actual download mechanism.

### Modified Capabilities
(none — `jira-parser` and `popup-shell` are unaffected)

## Impact

- New directory `app/src/lib/markdown-serializer/` (serializer + attachment-naming logic + tests).
- New dependency: `turndown` (plus `@types/turndown` if not bundled) for inline HTML→Markdown conversion — a plain library, not a UI framework, so it doesn't violate NFR-05.
- No changes to `docs/requirements.md` — implements existing `accepted`/`proposed` requirements FR-10, FR-13, and FR-14 (currently `proposed`; this change doesn't resolve that status, just implements the behavior as specified).
