@feature:F5
Feature: Job Management & Persistence
  As a User
  I want jobs to be persisted with a type discriminator and resumable per workflow
  So that long-running translation, voiceover, and combined jobs survive interruption and queue fairly

  Rule: Job type discrimination on creation
    @api @smoke
    Scenario: A newly created job stores its workflow type exactly as declared
      Given a User submits a new job via POST /api/v1/jobs with "job_type" set to "translation+voiceover"
      When the job is persisted
      Then the stored job row has "job_type" equal to exactly one of "translation", "voiceover", or "translation+voiceover"

    @api @regression
    Scenario: A job submitted with an unsupported job_type is rejected
      Given a User submits a new job via POST /api/v1/jobs with "job_type" set to "narration"
      Then the request is rejected with a validation error identifying "job_type" as invalid

  Rule: Bounded in-process active job queue
    @api @smoke
    Scenario: A fourth job is queued when three jobs are already active
      Given three jobs are currently active
      When a fourth job is submitted
      Then the fourth job is persisted with status "queued" and is not started until one of the active jobs finishes

    @api @regression
    Scenario: A queued job starts after an active job finishes
      Given three jobs are active and one job is waiting with status "queued"
      When one of the active jobs finishes
      Then the waiting job transitions from "queued" to "running" and no more than three jobs are running simultaneously

  Rule: Voiceover job resumption from last completed chunk
    @api @smoke
    Scenario: A resumed voiceover job regenerates only chunks after the last completed one
      Given a "voiceover" job was interrupted after completing chunk 7
      When the worker reads "last_chunk_id" for that job
      Then audio generation resumes from chunk 8 and chunks 1 through 7 are not regenerated

    @api @regression
    Scenario: A voiceover job with no previously completed chunks starts from the first chunk
      Given a "voiceover" job has never started processing any chunks
      When the worker reads "last_chunk_id" for that job
      Then audio generation begins from chunk 1

  Rule: Translation job resumption from last completed chunk
    @api @smoke
    Scenario: A resumed translation job continues from the sentence-bounded chunk after the last completed one
      Given a "translation" job was interrupted after completing chunk 5
      When the worker reads "last_chunk_id" for that job
      Then translation resumes from the sentence-bounded chunk 6 and chunk 5 is not retranslated

    @api @regression
    Scenario: A translation job resumes at the next sentence boundary when the interruption split a sentence
      Given a "translation" job was interrupted mid-sentence within chunk 4 and chunk 4 is not marked complete
      When the worker reads "last_chunk_id" for that job
      Then translation resumes from the start of the incomplete sentence and chunk 3 is not retranslated

  Rule: Real-time WebSocket progress events
    @integration @smoke
    Scenario: A client receives a progress event within one second of a chunk completing
      Given a User has an open WebSocket connection on /api/v1/jobs/{id}/events for an active job
      When a chunk of that job completes processing
      Then the server pushes a JSON event containing "job_id", "job_type", "chunk_id", "progress_current", "progress_total", and "status" to the client within 1 second

    @integration @regression
    Scenario: A client that connects mid-job still receives the next progress event
      Given a User opens a WebSocket connection on /api/v1/jobs/{id}/events after chunk 3 of a job has already completed
      When chunk 4 of that job completes processing
      Then the server pushes the progress event for chunk 4 to that client within 1 second

  Rule: Persisted provider and model surface on the single-job view
    Scenario: A translation job's persisted provider and model surface on GET /api/v1/jobs/{id}
      Given a User creates a translation job with provider "ollama" and model "translategemma:12b"
      When the User fetches the job via GET /api/v1/jobs/{id}
      Then the response body contains "provider" equal to "ollama" and "model" equal to "translategemma:12b"

  Rule: Consolidated OpenAI-compatible mock service

    @api @smoke
    Scenario: The consolidated mock service exposes /v1/chat/completions for translation
      Given the consolidated mock service is running on 127.0.0.1:8765
      When a client POSTs an OpenAI-compatible chat-completions body to /v1/chat/completions
      Then the response carries the OpenAI envelope with the translated text in choices[0].message.content

    @api @smoke
    Scenario: The consolidated mock service exposes /v1/audio/speech for TTS
      Given the consolidated mock service is running on 127.0.0.1:8765
      When a client POSTs an OpenAI-compatible audio-speech body to /v1/audio/speech
      Then the response is raw WAV bytes (Content-Type: audio/wav) starting with the RIFF magic
