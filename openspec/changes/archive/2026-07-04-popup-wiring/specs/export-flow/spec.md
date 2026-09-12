## ADDED Requirements

### Requirement: Extract Ticket Data from the Active Tab DOM
The export flow SHALL obtain ticket data by running `parseJiraTicket` against the DOM of the active tab, via `chrome.scripting.executeScript` under the `activeTab` grant, and SHALL NOT call any tracker API or use any token (FR-02). No host permission SHALL be declared in the manifest for this (NFR-04).

#### Scenario: Export reads the rendered page
- **WHEN** the user triggers Export on a recognized Jira ticket tab
- **THEN** the flow injects the extraction script into that tab, runs `parseJiraTicket(document)`, and receives the resulting `ParseResult` without contacting any tracker API

#### Scenario: Active tab is not a parseable ticket
- **WHEN** extraction runs but `parseJiraTicket` returns `{ ok: false }`
- **THEN** the flow shows the error state with the parser's reason and performs no downloads

### Requirement: Detect a Jira Ticket Page on Popup Open
The popup SHALL determine on open whether the active tab looks like a Jira ticket page using a pure URL heuristic, and SHALL enable the Export button only when it does; otherwise the Export button SHALL be disabled and a hint SHALL be shown (FR-04).

#### Scenario: Active tab is a Jira ticket URL
- **WHEN** the popup opens on a tab whose URL matches a Jira ticket shape (e.g. a `/browse/<KEY-123>` path)
- **THEN** the Export button is enabled and no "open a ticket" hint is shown

#### Scenario: Active tab is not a Jira ticket URL
- **WHEN** the popup opens on a tab whose URL does not match a Jira ticket shape
- **THEN** the Export button is disabled and the hint "Open a Jira ticket" is shown

### Requirement: Optional Anonymization Before Serialization
When the anonymization checkbox is checked, the export flow SHALL pass the parsed ticket through `anonymizeTicket` before serialization and attachment planning; when unchecked, it SHALL serialize the ticket as parsed (FR-09, FR-19).

#### Scenario: Anonymization enabled
- **WHEN** Export runs with the anonymization checkbox checked
- **THEN** the Markdown, comments, and attachment file names contain `UserN` aliases instead of real names

#### Scenario: Anonymization disabled
- **WHEN** Export runs with the anonymization checkbox unchecked
- **THEN** the Markdown and attachment file names retain the original names as parsed

### Requirement: Build the Export Folder and File Layout
The export flow SHALL produce a `Downloads/<TICKET-ID>/` folder containing `<TICKET-ID>-<title>.md` and a `media/` subfolder, using a pure helper that keeps Cyrillic in the title and strips only filesystem-forbidden characters (FR-15, FR-16, FR-18).

#### Scenario: Folder and file names derive from the ticket
- **WHEN** the flow builds export paths for a ticket with key `ROVODEV-36` and a Cyrillic title
- **THEN** the Markdown path is `ROVODEV-36/ROVODEV-36-<title>.md` with Cyrillic preserved, filesystem-forbidden characters removed, and the media directory is `ROVODEV-36/media`

#### Scenario: Title contains forbidden characters
- **WHEN** the ticket title contains characters forbidden by file systems (e.g. `/`, `:`, `?`)
- **THEN** those characters are stripped from the file name while the remaining text, including Cyrillic, is preserved

### Requirement: Download the Markdown File and Attachments Separately
The export flow SHALL write the `.md` file and each attachment as separate `chrome.downloads` downloads into the ticket folder, with attachments in the `media/` subfolder using their order-preserving `NN-` prefixed names, and SHALL NOT produce a ZIP archive (FR-11, FR-13, FR-17).

#### Scenario: A ticket with attachments is exported
- **WHEN** Export completes for a ticket with two attachments
- **THEN** the `.md` file is downloaded to `Downloads/<TICKET-ID>/` and each attachment is downloaded into `Downloads/<TICKET-ID>/media/` with `01-`, `02-` prefixes, as separate downloads (no ZIP)

### Requirement: Partial Success on Attachment Failure
A failed attachment download SHALL be recorded in a visible failure list but SHALL NOT abort the Markdown conversion or the remaining attachment downloads (FR-12). Each attachment's outcome SHALL be tracked independently.

#### Scenario: Some attachments fail to download
- **WHEN** the `.md` downloads successfully but one or more attachment URLs cannot be fetched (e.g. expired links)
- **THEN** the successful downloads still complete, the flow shows the success state, and the failed attachments are listed in a caveats details block

#### Scenario: The Markdown file itself fails to download
- **WHEN** the `.md` download fails
- **THEN** the flow shows the error state with details, since no usable export was produced

#### Scenario: All downloads succeed
- **WHEN** the `.md` and every attachment download successfully
- **THEN** the flow shows the success state with no caveats
