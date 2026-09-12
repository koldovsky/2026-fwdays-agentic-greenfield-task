## ADDED Requirements

### Requirement: Parse Core Ticket Identity
The parser SHALL extract the ticket key and title from a Jira ticket page DOM, and SHALL treat these two fields as required — a document missing either SHALL be reported as a parse failure rather than a partial `ParsedTicket`.

#### Scenario: Well-formed ticket page
- **WHEN** the parser is given the DOM of a rendered Jira ticket page containing `#key-val` and `#summary-val`
- **THEN** it returns a `ParsedTicket` with `key` equal to the ticket key text and `title` equal to the summary text

#### Scenario: Document missing key or title
- **WHEN** the parser is given a DOM lacking `#key-val` or `#summary-val`
- **THEN** it returns a failure result (not a `ParsedTicket` with empty key/title) so the caller can surface an honest error

### Requirement: Parse Optional Metadata Fields Without Failing on Absence
The parser SHALL extract issue type, status, resolution, priority, components, and labels when present, and SHALL leave scalar fields as `undefined` / list fields as `[]` (not throw) when the corresponding DOM element is absent.

#### Scenario: All optional fields present
- **WHEN** the DOM contains `#type-val`, a status control, `#resolution-val`, `#priority-val`, `#components-val`, and `#labels-val` with values
- **THEN** the parser returns each corresponding field populated with the extracted text

#### Scenario: Optional fields absent (real-world common case)
- **WHEN** the DOM has no priority or labels elements (as in the `examples/` ROVODEV-36 fixture)
- **THEN** the parser completes successfully with `priority: undefined` and `labels: []`, with no exception thrown

### Requirement: Parse Status from Either Modern or Legacy Selector
The parser SHALL attempt `#status-val` first, and SHALL fall back to the transitions-dropdown selector (`#opsbar-transitions_more .dropdown-text`) used by the `jira.atlassian.com` public tracker template when `#status-val` is absent.

#### Scenario: Legacy template without #status-val
- **WHEN** the DOM has no `#status-val` but has `#opsbar-transitions_more .dropdown-text` with text "Gathering Interest"
- **THEN** the parser returns `status: "Gathering Interest"`

### Requirement: Parse Description as Structured Content
The parser SHALL extract the description block's content in a form that preserves paragraphs, lists, links, and code blocks for later Markdown conversion (not just flattened plain text).

#### Scenario: Description with mixed content
- **WHEN** `#description-val` contains paragraphs, a bullet list, and a hyperlink
- **THEN** the parser's returned description structure preserves each element distinctly enough that a serializer can reconstruct paragraphs, list items, and links separately

### Requirement: Parse People and Dates
The parser SHALL extract assignee and reporter from the people module, and created/updated timestamps from the dates module, when present.

#### Scenario: People and dates present
- **WHEN** `#peoplemodule` and `#datesmodule` contain assignee/reporter and created/updated entries
- **THEN** the parser returns those values populated

#### Scenario: People or dates module fields absent
- **WHEN** an expected entry (e.g. no assignee) is missing from `#peoplemodule`
- **THEN** the corresponding field is `undefined` and parsing does not fail

### Requirement: Parse Comments in Order
The parser SHALL extract all comments from the activity module in the order they appear in the DOM, and SHALL return an empty array (never `undefined`/`null`) when there are none.

#### Scenario: Ticket with no comments
- **WHEN** the activity module contains no comment entries (as in the `examples/` ROVODEV-36 fixture)
- **THEN** the parser returns `comments: []`

#### Scenario: Ticket with multiple comments
- **WHEN** the activity module contains several comment entries
- **THEN** the parser returns them as an array in the same order they appear in the DOM, each with author and body text

### Requirement: Parse Attachment Metadata in Order
The parser SHALL extract attachment name and URL metadata (not bytes) in DOM order, and SHALL return an empty array when there are none.

#### Scenario: Ticket with no attachments
- **WHEN** the page has no attachment elements (as in the `examples/` ROVODEV-36 fixture)
- **THEN** the parser returns `attachments: []`

#### Scenario: Ticket with attachments
- **WHEN** the page contains attachment entries with names and download URLs
- **THEN** the parser returns them as an array in DOM order, each with `name` and `url`, without fetching the bytes
