@feature:F4
Feature: Voice-Over Generation
  As a Content Creator or Audiobook Producer
  I want to generate spoken audio from EPUB chapter text using a selectable TTS provider and voice profile
  So that I can produce audiobook-grade chapter audio from an EPUB without manual narration

  Rule: Voice-Over-only job creation and audio language resolution

    @api @smoke
    Scenario: Voice-Over-only job is accepted and audio generated in the EPUB's primary declared language
      Given a voiceover job request with no translation fields present and an EPUB that declares exactly one language
      When the request is submitted to POST /api/v1/jobs
      Then the job is accepted with HTTP 202, persisted with job_type = "voiceover", and audio is generated in that single declared language

    @api @regression
    Scenario: Multi-language EPUB resolves audio to the primary declared language
      Given an EPUB that declares two or more language entries and a Voice-Over-only job created without an explicit audio-language selection
      When the job runs without an explicit audio-language selection
      Then the audio is generated in the highest-priority declared language, the resolved primary language is recorded on the job row, and the resolved primary language is surfaced in the progress UI

    @api @regression
    Scenario: Ambiguous language priority falls back to the first spine-ordered language
      Given an EPUB that declares two or more language entries with ambiguous priority
      When a Voice-Over-only job is created without an explicit audio-language selection
      Then the audio is generated in the language that appears first in the spine and the resolved primary language is recorded on the job row

  Rule: Audio chunking at sentence boundaries

    @web @regression
    Scenario: Chapter text is chunked at 4096-character sentence boundaries for TTS
      Given a Voice-Over-only job is running and a chapter's text is longer than 4096 characters
      When audio chunking processes the chapter text
      Then each TTS request input is no longer than 4096 characters and ends at a sentence boundary

    @api @regression
    Scenario: Short chapter text is sent as a single TTS request
      Given a Voice-Over-only job is running and a chapter's text is shorter than 4096 characters
      When audio chunking processes the chapter text
      Then a single TTS request input is produced ending at a sentence boundary

  Rule: Per-chapter audio stitching into chapter files

    @api @smoke
    Scenario: Stitched chapter audio length equals the sum of chunk durations
      Given a chapter's audio chunks have been generated and a user-selected output format
      When stitching of the chunks completes
      Then the chapter audio file length equals the sum of chunk durations within ±50ms and the file is encoded in the user-selected output format

    @api @regression
    Scenario: Stitching a chapter with a single chunk produces a valid output file
      Given a chapter has exactly one generated audio chunk and a user-selected output format
      When stitching completes
      Then the chapter audio file length equals that chunk's duration within ±50ms and is encoded in the user-selected output format

  Rule: Combined workflow consumes translated text for voice-over

    @integration @smoke
    Scenario: Combined job voice-over uses translated chapter text
      Given a combined job with translation and voice-over enabled and a chapter whose translation has completed
      When the Voice-Over pipeline consumes the chapter
      Then the generated audio is based on the translated chapter text rather than the source chapter text

    @integration @regression
    Scenario: Voice-Over pipeline waits until chapter translation is finished
      Given a combined job where a chapter's translation is still in progress
      When the voice-over pipeline reaches that chapter
      Then the pipeline does not begin TTS until that chapter's translation has completed

  Rule: TTS provider timeout handling and resumability

    @api @smoke
    Scenario: Provider timeout aborts, retries once, and fails the chunk on second consecutive failure
      Given a Voice-Over job is running and a TTS provider call exceeding 60 seconds
      When the call has not returned after 60 seconds
      Then the call is aborted and retried once, and on the second consecutive failure the chunk is marked failed, last_chunk_id is persisted, the job transitions to failed with error.code = "provider_timeout", and is resumable via F5

    @api @regression
    Scenario: Successful retry after a timeout keeps the job running
      Given a Voice-Over job is running and a TTS provider call exceeding 60 seconds
      When the call is aborted and retried once
      Then the retry returns within 60 seconds and the job continues processing without transitioning to failed

  Rule: Voice-over configuration form

    @web @smoke
    Scenario: Voice-over form shows OpenAI Base URL + API key at the top
      Given the voice-over configuration step is rendered
      When the form is inspected
      Then OpenAI Base URL and OpenAI API key fields appear at the top of the form

    @web @smoke
    Scenario: The language field is labeled "Voice-over Language" and shows full language names
      Given the voice-over configuration step is rendered
      When the user inspects the language field label
      Then the label reads "Voice-over Language" and the options show "English (en)" style full names

    @web @smoke
    Scenario: Start Voice-Over button is disabled until the form is valid
      Given the voice-over configuration step is rendered with the form empty
      When the form fields are not all filled
      Then the Start Voice-Over button is disabled

    @web @regression
    Scenario: The broken Settings link is removed from the workflow chooser page
      Given the user has uploaded an EPUB and the metadata preview is visible
      When the user inspects the top of the page
      Then there is no "Settings" link leading to /settings
