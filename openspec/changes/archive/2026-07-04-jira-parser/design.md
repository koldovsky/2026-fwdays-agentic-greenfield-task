## Context

`examples/[ROVODEV-36]...html` is a saved page from `jira.atlassian.com`'s public "Suggestion" tracker (legacy Jira Server/Data Center-style DOM, `#issue-content`-based layout — not the newer Jira Cloud React UI). Inspecting it directly (not guessing from generic Jira docs) gives concrete anchors:

- `#key-val` — ticket key (`ROVODEV-36`), also `data-issue-key` on the same `<a>`
- `#summary-val h2` — title
- `#type-val .value` — issue type
- `#resolution-val .value` — resolution (`unresolved` class present when unresolved)
- `#components-val .value` — components (may be empty)
- `#description-val` — description body (rich HTML: paragraphs, lists, links, code blocks)
- `#peoplemodule` — assignee/reporter (`dt`/`dd` pairs)
- `#datesmodule` — created/updated (`dt`/`dd` pairs, with a `title` attribute holding the full timestamp and visible text often relative, e.g. "3 days ago")
- `#activitymodule` — comments live here when present (this fixture has none — the module exists but is empty of actual comment entries)
- Status is **not** `#status-val` in this template — it's the tooltip-bearing dropdown at `#opsbar-transitions_more .dropdown-text` (visible text, e.g. "Gathering Interest"), with the fuller description available in the element's `title` attribute (HTML-escaped, containing `<span class="jira-issue-status-tooltip-title">…</span>`)
- No `#priority-val`, `#labels-val`, or attachment elements exist in this fixture at all — priority/labels are configurable per Jira project and commonly absent; this ticket also has zero attachments

Because the real fixture already lacks several "typical" fields, this design treats **absence as the default case to design for**, not a rare edge case.

## Goals / Non-Goals

**Goals:**
- Parse `#issue-content` (or the full `Document`) into a plain `ParsedTicket` TypeScript object with no Chrome/DOM-framework leakage past the parser boundary (consumers get plain data, not live DOM nodes).
- Every field is independently optional except `key` and `title` — a ticket with no components, no comments, no attachments, no resolution parses successfully and produces a ticket with those fields empty/undefined.
- Comments and attachments are parsed as arrays (possibly empty) with stable, order-preserving indices (comments in DOM order; attachments in DOM order, since serializer/downloads need order for `01-`, `02-` prefixes later per FR-13).
- Parser accepts an injectable root (`Document | Element`) so tests can load the static fixture via `jsdom`/`happy-dom` without any Chrome APIs, and so the real extension can later pass `document` from the active tab's content script.

**Non-Goals:**
- Markdown conversion of the parsed structure (next change, `markdown-serializer`).
- Fetching attachment bytes (later, in `popup-wiring`/downloads flow) — this parser only extracts attachment *metadata* (name, URL) from the DOM.
- Azure DevOps or any non-Jira source (out of MVP scope).
- Anonymization (separate `anonymizer` change) — parser output still contains real names.

## Decisions

- **jsdom over happy-dom for the test environment**: jsdom has broader, more battle-tested HTML/CSS-selector-edge-case coverage for a large, real-world saved page (2600+ lines of legacy Jira markup with inline SVGs, escaped attributes, etc.); happy-dom is faster but less exhaustively spec-compliant. Test speed at this fixture's size is not a concern (single-digit ms parses), so correctness wins. Loaded only as a Vitest test dependency — never bundled into the shipped extension (NFR-07's "framework-free" constraint is about the parser's own code, not the test harness).
- **Parser takes a DOM root, not a URL or HTML string**: matches FR-02 (data comes from the DOM of the already-open tab) and keeps the parser Chrome-API-free — in production the content script passes `document`; in tests, `jsdom`'s parsed document from the fixture file is passed the same way. No branching between "test mode" and "real mode" inside the parser itself.
- **Status parsed from `#opsbar-transitions_more`'s `dropdown-text` + `title`, not a guessed `#status-val`**: verified against the actual fixture rather than assumed from generic Jira documentation, since this template doesn't use that ID. A defensive fallback (try `#status-val` first, fall back to the opsbar selector) is included in case other Jira templates (e.g. a self-hosted instance) do use the simpler ID — cheap to support both, costly to support only one and break on the other.
- **Optional fields represented as `undefined`, not empty string or thrown error**: lets the serializer (next change) decide how to render "no components" vs. "components: none" without the parser making a presentation decision. Matches the error-handling contract's spirit in `AGENTS.md` (partial/missing data is a first-class, visible-but-non-fatal case, not a crash).
- **Comments/attachments as empty arrays when absent, never `null`/`undefined`**: simpler downstream iteration (`for (const c of ticket.comments)` always works) versus optional-array fields elsewhere being `undefined`.

## Risks / Trade-offs

- [The only available fixture (ROVODEV-36) has no comments, no attachments, no priority, no labels] → Mitigation: write the parser logic for those fields from documented Jira DOM conventions (`dt`/`dd` structure consistent with `peoplemodule`/`datesmodule`) and cover them with hand-written minimal HTML fixtures in the test suite alongside the real-page fixture, so untested-by-the-real-fixture code paths are still covered by *some* test, not skipped entirely.
- [Legacy Jira Server/Data Center template vs. modern Jira Cloud template differ significantly] → Mitigation: this parser targets the DOM shape actually captured in `examples/`; if a user opens a modern Jira Cloud ticket, selectors may not match. Documented as a known limitation, not silently guessed at — the parser should return a clearly-empty/failed result (e.g. missing `key`/`title`) rather than a garbage partial parse, so the popup's error state (FR-08) has something honest to report.
- [`jsdom` add-on weight] → Mitigation: devDependency only, doesn't affect the shipped bundle size or `NFR-02` (zero backend/paid APIs — jsdom is free, open-source, local).
