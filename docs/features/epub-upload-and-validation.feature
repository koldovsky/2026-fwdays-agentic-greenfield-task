@feature:F1
Feature: EPUB Upload & Validation
  As a Language Learner
  I want to upload an EPUB file and have it validated and its metadata extracted
  So that I can proceed to language-learning processing with a known, well-formed document

  Rule: File acceptance via drag-drop or file picker

    @web @smoke
    Scenario: User submits an EPUB file through drag-drop
      Given the Language Learner has the platform open in a browser
      When the user drags a file named "mystere-nocturne.epub" onto the upload area
      Then the file appears accepted by the picker and an upload request is initiated

    @web @regression
    Scenario: User selects an EPUB file through the file picker
      Given the Language Learner has the platform open in a browser
      When the user opens the file picker and chooses "mystere-nocturne.epub"
      Then the file appears accepted by the picker and an upload request is initiated

    @web @regression
    Scenario: Non-EPUB file extension is ignored by the picker
      Given the Language Learner has the platform open in a browser
      When the user drags a file named "notes.txt" onto the upload area
      Then the file is not accepted by the picker and no upload request is initiated

  Rule: EPUB format validation

    @api @smoke
    Scenario: Valid EPUB 3.0 archive passes format validation
      Given the uploaded file "mystere-nocturne.epub" is a valid EPUB 3.0 archive
      When the validation service validates the uploaded file
      Then the response has HTTP status 200 and no validation error is reported

    @api @regression
    Scenario: Non-EPUB archive is rejected with an invalid_epub error
      Given the uploaded file "fake.epub" is a ZIP archive that is not a valid EPUB 2.0/3.0 package
      When the validation service validates the uploaded file
      Then the response has HTTP status 422 with error.code equal to "invalid_epub"

    @web @regression
    Scenario: Invalid EPUB triggers a parse-error message in the chooser step
      Given the validation service has rejected the uploaded "fake.epub" with error.code "invalid_epub"
      When the user is returned to the chooser step
      Then a parse-error message is displayed next to the upload area

    @api @regression
    Scenario: Corrupted EPUB file that cannot be opened is rejected
      Given the uploaded file "broken.epub" has corrupted bytes preventing archive extraction
      When the validation service validates the uploaded file
      Then the response has HTTP status 422 with error.code equal to "invalid_epub"

  Rule: File size limit enforcement

    @web @smoke
    Scenario: EPUB within size limit completes the upload
      Given the Language Learner has chosen "mystere-nocturne.epub" which is 25 MB
      When the upload request completes
      Then the response has HTTP status 200 and the file is accepted for validation

    @web @regression
    Scenario: EPUB exceeding 50 MB is rejected before upload completes
      Given the Language Learner has chosen "huge-book.epub" which is 65 MB
      When the upload reaches the size limit
      Then the UI rejects the file before upload completes and no further processing happens

    @api @regression
    Scenario: Server rejects oversized upload with a file_too_large error
      Given the uploaded file "huge-book.epub" is 65 MB
      When the size-check step validates the file size
      Then the response has HTTP status 413 with error.code equal to "file_too_large"

    @integration @regression
    Scenario: Exactly 50 MB EPUB is accepted at the limit boundary
      Given the uploaded file "limit-bound.epub" is exactly 50 MB
      When the size-check step validates the file size
      Then the response has HTTP status 200 and the file is accepted for validation

  Rule: Metadata extraction and reporting

    @api @smoke
    Scenario: Metadata is extracted from a valid EPUB and returned to the chooser step
      Given a valid EPUB "mystere-nocturne.epub" has passed format and size validation
      When the extraction service extracts metadata from the EPUB
      Then the response includes the fields "title", "author", "declared_languages", and "chapter_count"

    @web @regression
    Scenario: Extracted metadata is presented to the user at the chooser step
      Given the extraction service has returned metadata for "mystere-nocturne.epub"
      When the user is returned to the chooser step
      Then the title, author, declared languages, and chapter count are displayed for review

    @api @regression
    Scenario: EPUB missing optional metadata still produces a valid response
      Given a valid EPUB "anonymous.epub" omits title and author metadata
      When the extraction service extracts metadata from the EPUB
      Then the response has HTTP status 200 and the "title" and "author" fields are empty while "chapter_count" returns a numeric value

    @integration @regression
    Scenario: Multi-language EPUB reports all declared languages
      Given the valid EPUB "bilingual-reader.epub" declares languages "fr" and "en"
      When the extraction service extracts metadata from the EPUB
      Then the response field "declared_languages" contains both "fr" and "en"

  Rule: Persona-specific acceptance across target users

    @web @smoke
    Scenario: Accessibility User can initiate upload using keyboard controls only
      Given an Accessibility User has the platform open in a browser with a screen reader active
      When the user focuses the upload control and activates the file picker using the keyboard
      Then the file picker opens and a chosen EPUB initiates an upload request

    @web @regression
    Scenario: Content Creator is warned before a rejected upload for an unsupported extension
      Given a Content Creator has the platform open in a browser and drags "manuscript.pdf" onto the upload area
      When the picker rejects the non-EPUB file
      Then an inline message states that only EPUB 2.0/3.0 files are accepted

    @integration @future
    Scenario: Audiobook Producer uploads a chapter-rich EPUB and metadata reports many chapters
      Given an Audiobook Producer has chosen a valid EPUB "long-series.epub" containing 120 chapters
      When the extraction service extracts metadata from the EPUB
      Then the "chapter_count" field equals 120 and the file is accepted for further processing

  Rule: Continue scrolls to the workflow chooser

    @web @smoke
    Scenario: Continue button scrolls the page to the workflow chooser
      Given the user has uploaded a valid EPUB and the metadata preview is visible
      When the user clicks the "Continue" button
      Then the page scrolls down to the workflow chooser

  Rule: Upload another re-opens the file picker

    @web @regression
    Scenario: Upload another re-opens the file picker
      Given the metadata preview is visible after a successful upload
      When the user clicks the "Upload another" button
      Then the file picker dialog opens
