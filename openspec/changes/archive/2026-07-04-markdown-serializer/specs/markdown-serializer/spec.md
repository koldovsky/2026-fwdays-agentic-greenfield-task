## ADDED Requirements

### Requirement: Serialize Core Ticket Content to Markdown (FR-10)
The serializer SHALL convert a `ParsedTicket` into a single Markdown string containing the title, key, and available metadata fields (type, status, resolution, priority, components, labels, assignee, reporter, created, updated).

#### Scenario: Full ticket with all metadata present (FR-10)
- **WHEN** `serializeTicketToMarkdown` is given a `ParsedTicket` with all metadata fields populated
- **THEN** the resulting Markdown contains the title as a heading, the key, and each populated metadata field rendered as readable text

#### Scenario: Ticket with absent optional metadata (FR-10)
- **WHEN** the ticket has `undefined`/empty values for priority, components, or labels (as in the real ROVODEV-36 fixture)
- **THEN** the serializer omits those fields from the output rather than rendering them as empty or "undefined"

### Requirement: Convert Description Blocks to Markdown (FR-10)
The serializer SHALL render each `DescriptionBlock` according to its kind: headings as `#`-prefixed lines matching their level, paragraphs as plain text, lists as `-`/numbered Markdown lists, and code blocks as fenced code blocks — converting each block's inline HTML content (links, bold, code spans) into corresponding Markdown inline syntax rather than emitting raw HTML.

#### Scenario: Paragraph with an inline link (FR-10)
- **WHEN** a paragraph block's `html` contains `<a href="https://example.com">example</a>`
- **THEN** the output Markdown contains `[example](https://example.com)`

#### Scenario: Ordered and unordered lists (FR-10)
- **WHEN** the description contains both an ordered and an unordered `DescriptionBlock`
- **THEN** the ordered list renders with numeric markers and the unordered list renders with `-` markers, each preserving item order

#### Scenario: Code block with a language hint (FR-10)
- **WHEN** a code block has `language: "bash"`
- **THEN** the output Markdown fenced code block's info string is `bash`

### Requirement: Plan Attachment File Names Independently of Download (FR-13, FR-18)
The serializer SHALL provide a pure function that assigns each attachment an order-preserving numeric prefix (`01-`, `02-`, …) and a filesystem-safe file name, without performing any network or file-system I/O.

#### Scenario: Multiple attachments in DOM order (FR-13)
- **WHEN** `planAttachmentNames` is given three attachments in DOM order
- **THEN** it returns three plans whose prefixes are `01-`, `02-`, `03-` in that same order

#### Scenario: Attachment name with filesystem-forbidden characters (FR-13, FR-18)
- **WHEN** an attachment's original name contains characters forbidden by common file systems (e.g. `:`, `?`, `"`)
- **THEN** the planned file name has those characters stripped while otherwise preserving the original name (no transliteration)

#### Scenario: No attachments (FR-13)
- **WHEN** `planAttachmentNames` is given an empty array
- **THEN** it returns an empty array

### Requirement: Markdown References Local Media Paths (FR-14)
The serialized Markdown SHALL reference attachments via their planned relative `media/<prefix>-<name>` path, so the exported folder is self-contained and works offline.

#### Scenario: Ticket with attachments (FR-14)
- **WHEN** the ticket has attachments and a corresponding attachment plan is provided to the serializer
- **THEN** the Markdown includes each attachment referenced by its `media/<prefix>-<name>` relative path, not its original remote URL
