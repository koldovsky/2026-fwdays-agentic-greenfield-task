## ADDED Requirements

### Requirement: Load the Unpacked Extension in a Real Browser
The E2E harness SHALL launch a real (headed) Chromium with the built extension from `app/dist/` loaded unpacked, using a persistent context and the `--load-extension` / `--disable-extensions-except` flags, and SHALL resolve the extension id at runtime.

#### Scenario: Extension loads and popup is reachable
- **WHEN** the harness launches Chromium with `app/dist/` loaded
- **THEN** the extension's id is resolved at runtime and its popup page (`chrome-extension://<id>/src/popup/index.html`) can be opened

#### Scenario: Build is required first
- **WHEN** `app/dist/` does not exist
- **THEN** the harness fails fast with a message indicating `npm run build:e2e` must run first

### Requirement: Drive the Popup Export Against a Deterministic Fixture
The E2E harness SHALL serve the saved ROVODEV-36 HTML fixture locally, navigate to it, trigger Export from the popup, and assert the popup reaches the success state (FR-05…FR-07).

#### Scenario: Export reaches success
- **WHEN** the popup's Export button is clicked on the locally served ROVODEV-36 fixture tab
- **THEN** the popup transitions through the in-progress state and ends in the success state (`data-state="success"`)

### Requirement: Assert the On-Disk Export Layout
The E2E harness SHALL direct downloads to a controlled directory and assert the resulting folder/file layout: a `<TICKET-ID>/` folder, a `<TICKET-ID>-<title>.md` file preserving Cyrillic and stripping only forbidden characters, and a `media/` subfolder whose entries carry order-preserving `NN-` prefixes (FR-13, FR-15, FR-16, FR-18).

#### Scenario: Folder and files exist on disk
- **WHEN** an export of ROVODEV-36 completes
- **THEN** the controlled downloads directory contains `ROVODEV-36/ROVODEV-36-<title>.md` and a `ROVODEV-36/media/` subfolder with `NN-` prefixed files

### Requirement: Assert Anonymization in the Exported Markdown
When anonymization is enabled (default), the E2E harness SHALL assert the exported Markdown contains `UserN` aliases and does not contain the ticket's known real names (FR-19).

#### Scenario: Names are anonymized in the .md
- **WHEN** the export runs with the anonymization checkbox checked
- **THEN** the `.md` body contains at least one `UserN` alias and none of the ticket's known real names

### Requirement: Partial Attachment Failure Stays a Success-with-Caveats
The E2E harness SHALL treat an attachment that cannot be downloaded (e.g. an expired link) as the FR-12 success-with-caveats outcome — the `.md` and other files are still produced and the popup still shows success with a caveats list — never an aborted export.

#### Scenario: An attachment link is unreachable
- **WHEN** one of the ticket's attachment URLs fails to download during an export
- **THEN** the `.md` file is still written, remaining attachments still download, and the popup shows the success state with the failed attachment listed in the caveats block

### Requirement: Record the Run for the Demo
The E2E harness SHALL be configured to record video of the run so a passing execution yields a recording usable as the homework demo source.

#### Scenario: A passing run produces a video
- **WHEN** the E2E suite runs to completion
- **THEN** a video recording of the run is written to the Playwright output directory
