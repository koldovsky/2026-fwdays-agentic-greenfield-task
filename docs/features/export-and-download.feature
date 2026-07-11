@feature:F6
Feature: Export & Download
  As a Language Learner, Content Creator, or Accessibility User
  I want to download the artifacts produced by my completed job
  So that I can read the translated book or listen to its spoken-language audio offline

  Background:
    Given a client has a valid API credential

  Rule: Translated EPUB download for translation jobs
    @api @smoke
    Scenario: Translated EPUB is served for a completed translation job
      Given a "translation" job with id "job-1" is "completed" and a translated EPUB artifact exists on scratch disk
      When the client requests GET /api/v1/jobs/job-1/download with artifact=epub
      Then the translated EPUB is served with filename "[BookTitle]-[target_language].epub"

    @api @regression
    Scenario: Requesting an EPUB before the job is completed returns an error
      Given a "translation" job with id "job-2" is still "processing"
      When the client requests GET /api/v1/jobs/job-2/download with artifact=epub
      Then the response has HTTP status 409 and error.code = "job_not_completed"

    @api @regression
    Scenario: Requesting a ZIP artifact for a translation-only job is not applicable
      Given a "translation" job with id "job-3" is "completed"
      When the client requests GET /api/v1/jobs/job-3/download with artifact=zip
      Then the response has HTTP status 404 and error.code = "artifact_not_applicable"

  Rule: Per-chapter audio ZIP download for voiceover jobs
    @api @smoke
    Scenario: Audio ZIP archive is served for a completed voiceover job
      Given a "voiceover" job with id "job-4" is "completed" and per-chapter audio files exist on scratch disk
      When the client requests GET /api/v1/jobs/job-4/download with artifact=zip
      Then a ZIP archive of per-chapter audio is served with filename "[BookTitle]-[spoken_language].zip"

    @api @regression
    Scenario: Requesting an EPUB for a voiceover-only job is not applicable
      Given a "voiceover" job with id "job-5" is "completed"
      When the client requests GET /api/v1/jobs/job-5/download with artifact=epub
      Then the response has HTTP status 404 and error.code = "artifact_not_applicable"

    @api @regression
    Scenario: Audio filenames reflect the spoken language rather than the target translation language
      Given a "voiceover" job with id "job-6" is "completed" where the spoken language differs from the target translation language
      When the client requests GET /api/v1/jobs/job-6/download with artifact=zip
      Then the ZIP archive filename is "[BookTitle]-[spoken_language].zip"

  Rule: Combined artifact delivery for translation+voiceover jobs
    @api @smoke
    Scenario: Both EPUB and ZIP artifacts are downloadable for a completed translation+voiceover job
      Given a "translation+voiceover" job with id "job-7" is "completed" with both artifacts on scratch disk
      When the client requests GET /api/v1/jobs/job-7/download with artifact=epub and then with artifact=zip
      Then the EPUB is served with filename "[BookTitle]-[target_language].epub" and the ZIP is served with filename "[BookTitle]-[spoken_language].zip"

    @api @regression
    Scenario: One artifact being unavailable does not prevent the other from being served
      Given a "translation+voiceover" job with id "job-8" completed but the voice leg failed so only the EPUB artifact was pre-built
      When the client requests GET /api/v1/jobs/job-8/download with artifact=zip
      Then the response has HTTP status 404 and error.code = "artifact_not_applicable"

  Rule: Artifact retention TTL on scratch disk
    @api @regression
    Scenario: Artifacts are deleted after the retention TTL elapses without download
      Given a "translation" job with id "job-9" is "completed" and its EPUB has been on scratch disk for longer than the configured TTL of 24h without being downloaded
      When the retention sweep runs
      Then the EPUB is no longer present on scratch disk and GET /api/v1/jobs/job-9/download with artifact=epub returns HTTP 410 with error.code = "artifact_expired"

    @api @regression
    Scenario: The job row persists with status "expired" after artifacts are removed
      Given a "voiceover" job with id "job-10" is "completed" and its audio files have aged past the TTL
      When the retention sweep runs
      Then the job row for job-10 remains with status "expired"

    @api @wip
    Scenario: Downloading an artifact before the TTL elapses keeps it on scratch disk
      Given a "translation" job with id "job-11" is "completed" and its EPUB has been on scratch disk for 23h
      When the client requests GET /api/v1/jobs/job-11/download with artifact=epub
      Then the EPUB is served and remains present on scratch disk past the original 24h deadline

  Rule: Large artifact streaming delivery
    @api @smoke
    Scenario: A large artifact is streamed to the client without full buffering
      Given a completed job whose requested artifact is 500MB in size
      When the client requests the download over a stable connection
      Then the first byte is received in under 2 seconds and the response uses Transfer-Encoding: chunked

    @api @regression
    Scenario: An artifact slightly over the 500MB threshold is still streamed
      Given a completed job whose requested artifact is 501MB in size
      When the client requests the download over a stable connection
      Then the first byte is received in under 2 seconds and the response uses Transfer-Encoding: chunked

  Rule: Safe interpolation of book title into the download filename
    @api @regression
    Scenario: Path separators and ASCII control characters in the book title are sanitised before interpolation
      Given a completed job whose EPUB title metadata is "A/B\\C" with an embedded NUL and a 0x1F character
      When the download filename is constructed
      Then every ASCII control character (0x00-0x1F, 0x7F) in the title is stripped, and every directory separator ("/" or "\") is replaced with "_", and the resulting filename is a single-segment basename

    @integration @regression
    Scenario: A malicious title with directory traversal sequences cannot escape the filename slot
      Given a completed job whose EPUB title metadata is "../../etc/passwd"
      When the download filename is constructed
      Then the returned filename contains no "/" or "\" characters and resolves to a single basename segment

    @api @regression
    Scenario: A book title with Unicode characters is preserved verbatim in the filename
      Given a completed job whose EPUB title metadata is "Книга「日本語」"
      When the download filename is constructed
      Then the Unicode characters are preserved in the filename and the filename remains a single-segment basename
