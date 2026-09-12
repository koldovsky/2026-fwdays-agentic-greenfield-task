## Context

`jira-parser` (archived) produces `ParsedTicket` with a `description: DescriptionBlock[]` where each block's textual content is a raw **inner-HTML fragment** (e.g. a paragraph's `html` might be `Customer requires native GitLab SaaS (<a href="...">gitlab.com</a>) integration…`). This change's job is turning that whole structure into one Markdown string, plus deciding attachment file names the Markdown will link to.

## Goals / Non-Goals

**Goals:**
- One pure function, `serializeTicketToMarkdown(ticket: ParsedTicket, attachmentPlan: AttachmentPlan[]): string`, framework-free, no Chrome APIs, no network/backend calls (NFR-01, NFR-02, NFR-07).
- Faithful conversion of each `DescriptionBlock` kind (heading/paragraph/list/code) into corresponding Markdown, converting inline HTML (links, bold, code spans) inside `html` fragments into Markdown inline syntax rather than dumping raw HTML into the `.md` file.
- A separate, independently-testable `planAttachmentNames(attachments: ParsedAttachment[]): AttachmentPlan[]` that assigns the order-preserving `01-`, `02-`, … prefix (FR-13) and a filesystem-safe name.
- Markdown embeds attachments as `media/<prefix>-<safe-name>` relative links (FR-14) — the serializer does not know or care whether those files were actually downloaded successfully; that's `popup-wiring`'s concern (FR-12's partial-success contract lives there, not here).

**Non-Goals:**
- Anonymization — this function serializes whatever `ParsedTicket` it's handed. If the caller wants anonymized output, it anonymizes the ticket (or the resulting Markdown) before/after calling this — decided in the `anonymizer` change.
- Downloading attachment bytes or writing files — `popup-wiring`.
- Ticket-level export folder/file naming (`Downloads/<TICKET-ID>/<TICKET-ID>-<title>.md`, FR-15–FR-18) — a distinct, smaller concern bundled into `popup-wiring` since it's about the download call, not Markdown content.
- Comment timestamps — `jira-parser`'s `ParsedComment` currently has only `author`/`body` (no date); adding dates would mean reopening the already-archived `jira-parser` capability. Comments render as `**Author:** body` without a date. Documented as a known gap, not a silent omission, in case FR-10's "all comments" is later read to require timestamps.

## Decisions

- **`turndown` for inline HTML→Markdown, not a hand-rolled regex converter**: the parser's `DescriptionBlock.html` fragments can contain arbitrary nested inline markup (links, bold, code, nested spans). A regex-based converter is a well-known source of subtle bugs (nested tags, attribute quoting, escaping). `turndown` is a small (~15KB), MIT-licensed, dependency-light library — a plain JS library, not a UI framework, so it doesn't conflict with NFR-05 ("no UI framework") or NFR-02 ("zero paid APIs" — it's free/open-source and runs entirely locally, no network calls). It uses the ambient DOM (`document`/`DOMParser`), which is present in both the real extension (browser) and tests (jsdom via `@vitest-environment jsdom`, already established in `jira-parser`), so no extra runtime shim is needed.
- **Block-level structure driven by `DescriptionBlock.kind`, not re-parsing HTML**: the parser already did the DOM-structure work; the serializer trusts that shape (heading level → `#` count, list `ordered` → `-`/`N.`, code `language` → fenced code block info string) rather than re-deriving it from raw markup.
- **Attachment naming as its own pure function, decoupled from the download flow**: `planAttachmentNames` only computes what names *should* be; it performs no I/O. This lets `popup-wiring` reuse the exact same plan for both the Markdown links and the actual `chrome.downloads` calls without duplicating the numbering/sanitization logic, and lets this change's tests cover naming/dedup logic without any Chrome API or fetch involved.
- **Filesystem-unsafe character stripping for attachment names, separate from FR-18's ticket-title rule**: strips characters forbidden across common filesystems (`< > : " / \ | ? *` and control characters) from the original attachment name before prefixing. This mirrors FR-18's spirit (strip only forbidden characters, don't transliterate) but is implemented locally to this change since FR-18 specifically concerns the ticket title/folder name, owned by `popup-wiring`.
- **Markdown-escaping plain-text fields (title, key, type/status/resolution/priority, component/label/people names) separately from HTML-derived fields**: a ticket title or component name containing `*`, `_`, or `#` shouldn't accidentally trigger Markdown formatting. Plain-text fields go through a small `escapeMarkdown` helper; `DescriptionBlock.html` content goes through `turndown` instead, which already produces valid, correctly-escaped Markdown.

## Risks / Trade-offs

- [`turndown`'s default heading/list/emphasis style choices may not match Pico/GitHub-flavored Markdown conventions exactly] → Mitigation: configure `TurndownService` options (`headingStyle: 'atx'`, `bulletListMarker: '-'`, `codeBlockStyle: 'fenced'`) explicitly rather than relying on defaults, and cover the choices with tests against the real fixture's description content.
- [Comment dates absent from `ParsedComment`] → Mitigation: documented as a known non-goal above; revisit only if a future requirement explicitly demands comment timestamps (would need a `jira-parser` follow-up change, not a silent retrofit here).
- [Attachment name sanitization logic duplicated conceptually with a future FR-18 ticket-title sanitizer] → Mitigation: both are small, independent pure functions; if duplication becomes real code duplication (not just "same spirit"), extract a shared filename-sanitizing util in `popup-wiring` when that logic is written — not preemptively now, per YAGNI.
