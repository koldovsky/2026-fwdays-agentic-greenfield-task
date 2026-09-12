## 1. Setup

- [x] 1.1 Add `jsdom` as a devDependency and configure Vitest's `environment` (or a per-file `// @vitest-environment jsdom` pragma) so parser tests can load real HTML
- [x] 1.2 Create `app/src/lib/jira-parser/` with a `types.ts` defining `ParsedTicket`, `ParsedComment`, `ParsedAttachment` (all framework-free, no Chrome/DOM-lib-specific types beyond standard `Document`/`Element`)

## 2. Core identity + optional metadata

- [x] 2.1 Implement key/title extraction (`#key-val`, `#summary-val`); return a failure result when either is missing
- [x] 2.2 Implement type/resolution/priority/components/labels extraction (`#type-val`, `#resolution-val`, `#priority-val`, `#components-val`, `#labels-val`), each `undefined`/`[]` when absent
- [x] 2.3 Implement status extraction with `#status-val` primary + `#opsbar-transitions_more .dropdown-text` fallback

## 3. Description, people, dates

- [x] 3.1 Implement description parsing (`#description-val`) preserving paragraphs/lists/links/code blocks as structured content (not flattened text)
- [x] 3.2 Implement people extraction (`#peoplemodule`: assignee, reporter)
- [x] 3.3 Implement dates extraction (`#datesmodule`: created, updated)

## 4. Comments and attachments

- [x] 4.1 Implement comment extraction from `#activitymodule` in DOM order, returning `[]` when none
- [x] 4.2 Implement attachment metadata extraction (name + URL, no fetch) in DOM order, returning `[]` when none

## 5. Tests

- [x] 5.1 Test key/title extraction and the missing-key/title failure path against the real `examples/[ROVODEV-36]...html` fixture
- [x] 5.2 Test optional-field absence (priority/labels/comments/attachments empty; type/resolution/status present) against the real fixture — documented in test descriptions which fields the real fixture actually covers
- [x] 5.3 Write small hand-authored HTML fixtures for fields the real fixture doesn't exercise (comments present, attachments present, priority/labels present, ordered lists, code blocks) so those code paths aren't untested
- [x] 5.4 Test description structure preservation (headings/paragraphs/lists/links) against the real fixture's description content

## 6. Verification

- [x] 6.1 `npm run typecheck && npm run lint && npm run test` all pass, combined ~3s (NFR-06)
- [x] 6.2 Confirm no Chrome API or DOM-framework import exists anywhere under `app/src/lib/jira-parser/` (grep check — clean)
- [x] 6.3 Run `openspec validate jira-parser --strict` and confirm apply-clean
