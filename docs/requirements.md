# Ticket2MD — Requirements (PRD)

Status values: `accepted` — confirmed by the product owner; `proposed` — reasonable default awaiting confirmation.
Requirement IDs (FR-xx / NFR-xx) are used for traceability in specs, tests, PRs, and the demo recording.

Visual identity and popup composition live in [DESIGN.md](./DESIGN.md).

## 1. Functional requirements

### Ticket detection

| ID | Requirement | Status |
|----|-------------|--------|
| FR-01 | The extension supports Jira ticket pages. | accepted |
| FR-02 | All data is extracted from the DOM of the rendered page in the active tab. No tracker API calls, no tokens. | accepted |
| FR-03 | The unit of export is exactly one ticket — the one open in the active tab. | accepted |
| FR-04 | When the active tab is not a recognized ticket page, the popup shows a hint ("Open a Jira ticket") and the Export button is disabled. | proposed |

### Popup flow

| ID | Requirement | Status |
|----|-------------|--------|
| FR-05 | Popup state 1 (idle): title "Export ticket to MD", an anonymization checkbox (checked by default), and an Export button. | accepted |
| FR-06 | Popup state 2 (in progress): a loader is shown while extraction and downloads run. | accepted |
| FR-07 | Popup state 3 (success): a message confirming the export completed successfully. | accepted |
| FR-08 | Popup state 4 (error): an error message with available details about what broke (for example, the list of attachments that failed to download). | accepted |
| FR-09 | The anonymization checkbox affects data processing only; it introduces no additional popup states. | accepted |

### Export content

| ID | Requirement | Status |
|----|-------------|--------|
| FR-10 | The Markdown file captures everything the ticket contains: title, key/ID, fields (status, priority, labels, and similar visible metadata), description, checklists, links, and all comments. Comment bodies are flattened to plain text in MVP — list structure, paragraphs, and inline code inside comments are not preserved as separate blocks (unlike the description). | accepted |
| FR-11 | Attachments referenced in the ticket are downloaded into the `media/` subfolder. | accepted |
| FR-12 | Media is extracted best-effort from the DOM (attachment URLs may point to expiring bucket links). A failed media download is reported in the error details but never aborts the Markdown conversion or the remaining downloads. | accepted |
| FR-13 | Media files are renamed with an order-preserving numeric prefix: `01-screenshot.png`, `02-log.txt`, … Duplicated names after prefixing are deduplicated. | accepted |
| FR-14 | The `.md` file references local media paths (`media/01-…`) so the exported folder is self-contained and works offline. | proposed |

### Output structure

| ID | Requirement | Status |
|----|-------------|--------|
| FR-15 | The export result is a folder in Downloads named after the ticket ID: `Downloads/<TICKET-ID>/`. | accepted |
| FR-16 | Inside it: `<TICKET-ID>-<title>.md` plus a `media/` subfolder with all fetched attachments. | accepted |
| FR-17 | Files are written as separate downloads into the subfolder via the `chrome.downloads` API (no ZIP archive). | accepted |
| FR-18 | The ticket title in the file name keeps Cyrillic (no transliteration); only characters forbidden by file systems are stripped. | accepted |

### Anonymization

| ID | Requirement | Status |
|----|-------------|--------|
| FR-19 | Anonymization is enabled by default. First and last names found in ticket fields, description, and comments are replaced with `User1`, `User2`, … | accepted |
| FR-20 | The alias mapping is consistent within one export: the same person is always the same `UserN` across text, comments, and file names. | proposed |
| FR-21 | Names present in media file names are anonymized the same way before saving. | accepted |

## 2. Non-functional requirements

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-01 | Privacy: no analytics, trackers, fingerprinting, cookies, or telemetry. All conversion runs locally. The only permitted network activity is fetching attachments from the hosts the ticket page itself uses. | accepted |
| NFR-02 | Zero paid APIs, zero backend. | accepted |
| NFR-03 | UI language: English. | accepted |
| NFR-04 | Minimal Chrome permissions: `activeTab`, `scripting`, `downloads`; no broad host permissions beyond what DOM extraction requires. | proposed |
| NFR-05 | Popup stays lightweight: vanilla TypeScript, no UI framework; styling via Pico CSS (see DESIGN.md). | accepted |
| NFR-06 | Silent console in normal operation; build, lint, type-check, and tests each complete in under 60 s. | proposed |
| NFR-07 | Markdown conversion and anonymization live in a framework-free `lib/` and are 100% unit-testable. | accepted |

## 3. Technical stack

| Layer | Specification |
|-------|---------------|
| Platform | Chrome extension, Manifest V3 |
| Language | TypeScript, strict mode |
| Build | Vite + CRXJS |
| Popup UI | Vanilla TS + Pico CSS (no framework) |
| Core logic | Framework-free `lib/`: Jira DOM parser, Markdown serializer, anonymizer |
| Downloads | `chrome.downloads` API, relative subfolder paths |
| Testing | Vitest on `lib/`; parser fixtures from saved ticket pages (see `examples/` — a captured Jira ticket page is already in the repo) |
| E2E testing | Playwright, launched with `launchPersistentContext` + `--load-extension` against the unpacked build; drives the real popup and verifies downloaded files (headed mode required — extension loading is unreliable headless) |
| Distribution | Unpacked (`chrome://extensions` → Load unpacked) for the demo |

## 4. Testing & verification

- Unit tests (Vitest) cover the Markdown serializer, the anonymizer (including file-name anonymization and alias consistency), and the Jira DOM parser.
- The parser is tested against a static HTML fixture: the saved Jira ticket page in `examples/`.
- Failure path is tested explicitly: unreachable media URLs must produce the FR-12 behavior (partial success + error details), not an aborted export.
- E2E: Playwright loads the unpacked extension in a real Chrome instance, drives the popup through all four states (FR-05–FR-08), triggers export against the static ROVODEV-36 HTML fixture served locally (deterministic; no live Jira dependency), and asserts the downloaded Markdown and anonymization on disk. The same ticket backs the static `examples/` fixture used by unit tests, so parser behavior stays consistent between the two layers. Folder layout (`Downloads/<TICKET-ID>/…/media/`) is covered by `buildExportPaths` unit tests because Playwright saves on-disk files under GUID names.

## 5. Out of scope (MVP)

Trackers other than Jira (Azure DevOps is a post-MVP candidate), Firefox and non-Chromium browsers, formats other than Markdown (PDF, HTML), user-editable export templates, two-way sync to the tracker, bulk/board/sprint export, tracker REST API or MCP integration, Chrome Web Store publication, localization beyond English.

---

Document status: last updated 2026-07-04. Owner: Eugene.
