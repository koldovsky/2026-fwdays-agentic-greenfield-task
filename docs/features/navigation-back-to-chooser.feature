@feature:F8
Feature: Navigation Back to Workflow Chooser
  As any User
  I want a "Back to Workflow Choice" button to appear once my job has reached a terminal state
  So that I can start a new workflow in one click without manually resetting the UI

  Rule: Back to Workflow Choice button is visible in every terminal state

    @web @smoke
    Scenario: A completed job shows an enabled Back to Workflow Choice button
      Given a job with id "job-1" is in status "completed"
      When the user opens the active job view for "job-1"
      Then a "Back to Workflow Choice" button is visible and enabled

    @web @smoke
    Scenario: A failed job shows an enabled Back to Workflow Choice button
      Given a job with id "job-2" is in status "failed"
      When the user opens the active job view for "job-2"
      Then a "Back to Workflow Choice" button is visible and enabled

    @web @regression
    Scenario: A cancelled job shows an enabled Back to Workflow Choice button
      Given a job with id "job-3" is in status "cancelled"
      When the user opens the active job view for "job-3"
      Then a "Back to Workflow Choice" button is visible and enabled

    @web @regression
    Scenario: An expired job shows an enabled Back to Workflow Choice button
      Given a job with id "job-4" is in status "expired"
      When the user opens the active job view for "job-4"
      Then a "Back to Workflow Choice" button is visible and enabled

  Rule: Back to Workflow Choice button is hidden or disabled while the job is still running

    @web @smoke
    Scenario: A running job does not show a clickable Back to Workflow Choice button
      Given a job with id "job-5" is in status "running"
      When the user opens the active job view for "job-5"
      Then no "Back to Workflow Choice" button is shown, or the button is disabled
      And if disabled, the button has a tooltip stating the job must finish (or be cancelled) before navigating away

    @web @regression
    Scenario: A queued job does not show a clickable Back to Workflow Choice button
      Given a job with id "job-6" is in status "queued"
      When the user opens the active job view for "job-6"
      Then no "Back to Workflow Choice" button is shown, or the button is disabled
      And if disabled, the button has a tooltip stating the job must finish (or be cancelled) before navigating away

  Rule: Navigation back to the chooser preserves the session and isolates new jobs

    @web @smoke
    Scenario: Clicking Back to Workflow Choice routes the SPA to the chooser without a full page reload
      Given a job with id "job-7" is in status "completed"
      And the user has at least one EPUB uploaded in the current browser session
      When the user clicks the "Back to Workflow Choice" button
      Then the SPA routes to the top-level workflow chooser view
      And the navigation is performed without a full page reload
      And the previously uploaded EPUB remains available for reuse in the chooser

    @web @regression
    Scenario: A new job submitted after navigating back is a fresh POST with no implicit link to the prior job
      Given a job with id "job-8" is in status "completed"
      And the user has navigated back to the chooser
      When the user configures and submits a new job
      Then the new submission is a fresh POST /api/v1/jobs with no implicit resume link to "job-8"
      And the prior job row for "job-8" remains in status "completed" on the server

    @web @regression
    Scenario: Navigating back to the chooser does not auto-start a new job
      Given a job with id "job-9" is in status "completed"
      When the user clicks the "Back to Workflow Choice" button
      Then the chooser view is rendered with no job in progress
      And no POST /api/v1/jobs is issued as a side-effect of the navigation
