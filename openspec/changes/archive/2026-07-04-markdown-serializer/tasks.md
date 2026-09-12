## 1. Setup

- [x] 1.1 Add `turndown` (and `@types/turndown` if needed) as a dependency; create `app/src/lib/markdown-serializer/` directory

## 2. Attachment naming

- [x] 2.1 Implement `planAttachmentNames(attachments): AttachmentPlan[]` — order-preserving `01-`, `02-`, … prefix + filesystem-unsafe character stripping, no I/O
- [x] 2.2 Handle empty attachments array

## 3. Metadata + description serialization

- [x] 3.1 Implement plain-text metadata rendering (title, key, type, status, resolution, priority, components, labels, assignee, reporter, created, updated) with Markdown-escaping for plain-text fields, omitting absent/empty fields
- [x] 3.2 Configure a shared `TurndownService` instance (`headingStyle: 'atx'`, `bulletListMarker: '-'`, `codeBlockStyle: 'fenced'`)
- [x] 3.3 Implement `DescriptionBlock` → Markdown conversion for `heading`, `paragraph`, `list` (ordered/unordered), and `code` kinds

## 4. Comments + attachment references

- [x] 4.1 Render comments as `**Author:** body` (no date — documented gap, see design.md)
- [x] 4.2 Render attachment references in the Markdown using the `media/<prefix>-<name>` path from the attachment plan

## 5. Top-level API

- [x] 5.1 Implement `serializeTicketToMarkdown(ticket, attachmentPlan): string` composing all sections into one Markdown document

## 6. Tests

- [x] 6.1 Test full serialization against a `ParsedTicket` built from the real ROVODEV-36 fixture (via `jira-parser`'s `parseJiraTicket`)
- [x] 6.2 Test omission of absent optional metadata fields (priority/components/labels empty, as in the real fixture)
- [x] 6.3 Test inline HTML→Markdown conversion (links, bold, nested lists) with hand-authored `DescriptionBlock` fixtures
- [x] 6.4 Test `planAttachmentNames` numbering, character stripping, and empty-array cases
- [x] 6.5 Test that attachment Markdown references use `media/<prefix>-<name>`, not the original remote URL

## 7. Verification

- [x] 7.1 `npm run typecheck && npm run lint && npm run test` all pass, combined under 60s (NFR-06)
- [x] 7.2 Confirm no Chrome API import exists anywhere under `app/src/lib/markdown-serializer/` (grep check — clean)
- [x] 7.3 Run `openspec validate markdown-serializer --strict` and confirm apply-clean
