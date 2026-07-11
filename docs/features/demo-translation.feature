# @demo feature files are excluded from the default e2e run.
# Run explicitly with: npx playwright test --grep @demo
# Or: yarn test:e2e:demo  (once the @demo script is added to package.json)

@feature:DEMO-TRANSLATION
@demo
Feature: Translation Happy Path Demo
  As any User
  I want to translate an EPUB from its declared language to my target language and download the translated EPUB
  So that I can read a foreign-language book in my own language without leaving the platform

  Background:
    Given the demo EPUB file is available on the user's machine
    And the user opens the platform at the chooser view in a desktop browser

  Rule: Translation-only workflow end-to-end

    @demo @web @smoke
    Scenario: A user translates an EPUB from upload through translated EPUB download
      Given the chooser view is rendered with the three peer options
      When the user uploads the demo EPUB
      Then the EPUB metadata preview shows title, author, declared languages, and chapter count
      And the chooser becomes enabled
      When the user selects "Translation" in the chooser
      Then the Translation configuration panel is rendered
      And the Voice-Over configuration panel is not rendered
      When the user configures translation provider, model, source language, and target language
      And the user clicks "Start translation"
      Then a job is created with job_type = "translation" via POST /api/v1/jobs
      And the active job view opens and begins showing live WebSocket progress
      When the job reaches status "completed"
      Then a "Download translated EPUB" link is visible with filename "[BookTitle]-[target_language].epub"
      And no "Download audio ZIP" link is visible
      And the "Back to Workflow Choice" button is visible and enabled
      When the user clicks the "Back to Workflow Choice" button
      Then the SPA returns to the top-level workflow chooser view without a full page reload
