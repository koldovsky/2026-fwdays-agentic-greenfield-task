@feature:F7
Feature: Workflow Cancellation
  As any User
  I want to cancel a running or queued job from the active job view with a single click
  So that I can stop work I no longer need without waiting for the job to finish or fail on its own

  Rule: "Cancel job" button on the active job view

    @web @smoke
    Scenario: A running job shows an enabled "Cancel job" button
      Given a job with id "job-1" is in status "running"
      When the user opens the active job view for "job-1"
      Then a "Cancel job" button is visible and enabled

    @web @regression
    Scenario: Clicking Cancel on a running job calls DELETE and the button transitions to a disabled Cancelling label
      Given a job with id "job-2" is in status "running"
      When the user clicks the "Cancel job" button on the active job view for "job-2"
      Then the SPA calls DELETE /api/v1/jobs/job-2
      And the "Cancel job" button is replaced by a disabled "Cancelling…" label

  Rule: Backend cancellation API for cancellable jobs

    @api @smoke
    Scenario: DELETE on a running job transitions it to cancelled and the worker stops scheduling new chunks
      Given a job with id "job-3" is in status "running"
      When the client calls DELETE /api/v1/jobs/job-3
      Then the response has HTTP status 202
      And the job status transitions to "cancelled"
      And the in-process worker stops scheduling new chunks for that job

    @integration @smoke
    Scenario: A cancelled job pushes a status=cancelled WebSocket event within 1 second
      Given a job with id "job-4" is in status "running"
      And a client has an open WebSocket connection on /api/v1/jobs/job-4/events
      When the client calls DELETE /api/v1/jobs/job-4
      Then the server pushes a JSON event with status="cancelled" to that client within 1 second

    @api @smoke
    Scenario: DELETE on a queued job transitions it to cancelled without ever starting
      Given a job with id "job-5" is in status "queued"
      When the client calls DELETE /api/v1/jobs/job-5
      Then the response has HTTP status 202
      And the job status transitions to "cancelled"
      And the worker never starts processing any chunk of that job

  Rule: Terminal-state jobs cannot be cancelled

    @api @smoke
    Scenario: Cancelling a completed job returns 409 with job_not_cancellable
      Given a job with id "job-6" is in status "completed"
      When the client calls DELETE /api/v1/jobs/job-6
      Then the response has HTTP status 409
      And error.code = "job_not_cancellable"

    @api @regression
    Scenario: Cancelling an already cancelled job returns 409 with job_not_cancellable
      Given a job with id "job-7" is in status "cancelled"
      When the client calls DELETE /api/v1/jobs/job-7
      Then the response has HTTP status 409
      And error.code = "job_not_cancellable"

    @api @regression
    Scenario: Cancelling a failed job returns 409 with job_not_cancellable
      Given a job with id "job-8" is in status "failed"
      When the client calls DELETE /api/v1/jobs/job-8
      Then the response has HTTP status 409
      And error.code = "job_not_cancellable"

    @api @regression
    Scenario: Cancelling an expired job returns 409 with job_not_cancellable
      Given a job with id "job-9" is in status "expired"
      When the client calls DELETE /api/v1/jobs/job-9
      Then the response has HTTP status 409
      And error.code = "job_not_cancellable"

    @web @smoke
    Scenario: Clicking Cancel on a terminal-state job surfaces an inline error
      Given a job with id "job-10" is in status "completed"
      When the user clicks the "Cancel job" button on the active job view for "job-10"
      Then the SPA does not change the job status
      And the user sees an inline error message identifying that the job is no longer cancellable

  Rule: Cancellation marks partial artifacts as stale

    @api @regression
    Scenario: A cancelled combined job's EPUB download returns 410 with job_cancelled
      Given a "translation+voiceover" job with id "job-11" was cancelled mid-pipeline and its translation leg already produced partial EPUB chapters on disk
      When the client requests GET /api/v1/jobs/job-11/download with artifact=epub
      Then the response has HTTP status 410
      And error.code = "job_cancelled"

    @api @regression
    Scenario: A cancelled combined job's audio ZIP download returns 410 with job_cancelled
      Given a "translation+voiceover" job with id "job-12" was cancelled mid-pipeline and its voiceover leg already produced partial audio chunks on disk
      When the client requests GET /api/v1/jobs/job-12/download with artifact=zip
      Then the response has HTTP status 410
      And error.code = "job_cancelled"

    @api @regression
    Scenario: Partial artifacts produced before cancellation are retained on disk for diagnostics
      Given a "translation+voiceover" job with id "job-13" was cancelled after 5 of 10 chapters had been translated and 3 of 10 chapters had been voiced
      When the cancellation is processed
      Then the 5 translated chapter files and 3 audio files remain on the scratch disk
      And the job row records status="cancelled" and the last completed chunk id

  Rule: Active job view swap after cancellation

    @web @smoke
    Scenario: After cancellation the "Cancel job" button is replaced by a Back to Workflow Choice button
      Given a job with id "job-14" just transitioned to status "cancelled"
      When the active job view re-renders
      Then the "Cancel job" button is no longer visible
      And a "Back to Workflow Choice" button is visible and enabled
      And a "Job cancelled" confirmation message is displayed
