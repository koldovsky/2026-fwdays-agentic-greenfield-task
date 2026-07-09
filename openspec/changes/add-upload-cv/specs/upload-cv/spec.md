## ADDED Requirements

### Requirement: CV file upload with server-side text extraction
The system SHALL let a user provide their CV as a PDF or DOCX file — via drag-and-drop or a
click-to-browse file picker — and SHALL extract its plain text server-side: the raw file is sent
to `POST /api/cv/parse` and only extracted text is returned; the client never parses or receives
raw binary. PDF extraction uses `pdf-parse`, DOCX extraction uses `mammoth`. Implements FR-CV-01,
TC-PARSE-01, TC-PARSE-02.

#### Scenario: PDF dropped onto the dropzone
- **WHEN** a user drops a valid PDF CV onto the upload dropzone
- **THEN** the file is posted to `POST /api/cv/parse`, the response contains the extracted plain
  text, and that text appears in the CV textarea of the tailoring form

#### Scenario: DOCX chosen via the file picker
- **WHEN** a user activates the dropzone's browse control and selects a valid DOCX CV
- **THEN** the same extraction path runs and the extracted text appears in the CV textarea

#### Scenario: Extraction is server-side only
- **WHEN** the client bundle for the tailor workspace is built
- **THEN** it contains no PDF or DOCX parsing library, and the browser exchanges only the raw
  upload (out) and extracted plain text (back) with `POST /api/cv/parse`

### Requirement: Upload validation with calm failures
The system SHALL validate uploads on both sides — client-side for immediate feedback, server-side
as the trust boundary (declared MIME, magic bytes, and a 5 MB size limit) — and SHALL surface
every rejection or extraction failure as calm, localized copy driven by a coded JSON error, never
a raw exception, a 500, or a silent blank. Implements FR-CV-01, NFR-OBS-01, NFR-SEC-04.

#### Scenario: Unsupported file type
- **WHEN** a user drops a file that is neither PDF nor DOCX
- **THEN** the dropzone shows the calm unsupported-type message without uploading, and if such a
  file reaches the server anyway it is rejected with the coded `unsupported_type` JSON error

#### Scenario: File over the size limit
- **WHEN** a user drops a file larger than 5 MB
- **THEN** the dropzone shows the calm too-large message without uploading, and the server
  independently rejects oversized bodies with the coded `too_large` JSON error

#### Scenario: Spoofed file type is caught by magic bytes
- **WHEN** a request declares a PDF or DOCX `Content-Type` but the file's leading bytes do not
  match the declared format
- **THEN** the server rejects it with the coded `unsupported_type` error and never invokes an
  extraction library on the bytes

#### Scenario: Scanned or unparseable document
- **WHEN** an uploaded PDF or DOCX cannot be parsed, or parses to empty or whitespace-only text
  (an image-only scan)
- **THEN** the server responds with the coded `unparseable` error — the parse-library failure is
  caught, never propagated — and the dropzone shows calm copy that points the user to pasting
  their CV as text instead

### Requirement: Uploaded bytes are transient and never logged
The system SHALL hold uploaded file bytes only in memory for the duration of the parse request —
no temp files, no blob or database persistence — and SHALL never write the uploaded bytes or the
extracted CV text to any log or error message. Implements NFR-SEC-01.

#### Scenario: Upload leaves no stored copy
- **WHEN** a CV file upload completes, successfully or not
- **THEN** no copy of the file exists in any store after the response is sent; only the text
  returned to the client (and whatever the user later submits for tailoring) leaves the request

#### Scenario: Extraction failure logs no content
- **WHEN** an upload is rejected or extraction fails
- **THEN** any log entry and the error response carry an error code only — no file bytes, no
  extracted text, no CV content

### Requirement: Extracted text is reviewed before tailoring
The system SHALL place extracted text into the editable CV textarea rather than starting a
tailoring run, so the user reads, corrects, or replaces it before tailoring begins; uploading
again SHALL replace the textarea content. Implements the confirm/re-upload half of FR-CV-03 (the
structured summary rendering remains a follow-up capability).

#### Scenario: User edits extracted text before tailoring
- **WHEN** extraction completes and the text appears in the CV textarea
- **THEN** no tailoring run has started, and the user can edit the text before submitting the
  form as usual

#### Scenario: Re-upload replaces the previous extraction
- **WHEN** a user uploads a second file after a successful extraction
- **THEN** the new extracted text replaces the textarea content
