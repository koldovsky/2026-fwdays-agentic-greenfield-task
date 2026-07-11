@feature:F2
Feature: Translation Configuration
  As a Language Learner
  I want to choose a translation provider, model, and source/target languages for my EPUB
  So that the book is translated into a language I am learning

  Rule: Translation fields appear only when translation was chosen

    @web @smoke
    Scenario: Translation configuration surfaces all four fields after "Translation" or "both" selection
      Given the user selected "Translation" in the chooser
      When the configuration step renders
      Then translation provider, model, source language, and target language fields are visible on the screen

    @web @smoke
    Scenario: Translation configuration also surfaces when the user selected "both"
      Given the user selected "both" in the chooser
      When the configuration step renders
      Then translation provider, model, source language, and target language fields are visible on the screen

    @web @regression
    Scenario: No translation fields render when the user selected "Voice-Over" only
      Given the user selected "Voice-Over" only in the chooser
      When the configuration step renders
      Then no translation provider, source language, or target language fields appear on the screen

  Rule: Source language defaults to the EPUB's declared language

    @web @smoke
    Scenario: Source language defaults to the single language declared by the EPUB
      Given the source language selection is unset
      When the EPUB declares a single language
      Then the source language field is pre-filled with that declared language

    @web @regression
    Scenario: Source language remains unset when the EPUB declares multiple languages
      Given the source language selection is unset
      When the EPUB declares more than one language
      Then the source language field is left blank for the user to choose

  Rule: Source language is mandatory before a translation job can be created

    @api @smoke
    Scenario: Creating a translation job succeeds when a source language is selected
      Given the user has selected a translation provider, model, source language, and target language
      When the user submits the translation job request
      Then the job is accepted and a job reference is returned

    @api @regression
    Scenario: Rejecting a translation job when the EPUB declares no language and source is unselected
      Given the EPUB declares no dc:language
      And the source language is unset
      When the user submits the translation job request
      Then the job is not created
      And the response is HTTP 422 with error.code "source_language_required"

  Rule: Provider and model selection

    @web @smoke
    Scenario: Choosing the Ollama provider lists its available models
      Given the translation provider field is visible
      When the user selects "Ollama" as the provider
      Then the model field lists models available from the Ollama endpoint

    @web @regression
    Scenario: Choosing an OpenAI-compatible provider requires an API key
      Given the translation provider field is visible
      When the user selects an OpenAI-compatible provider
      Then an API key input is shown and the model field remains empty until a valid key is supplied

    @integration @regression
    Scenario: Target languages include at least 55 options
      Given the translation configuration is visible
      When the target language field is opened
      Then the list contains no fewer than 55 target languages

  Rule: Target language selection for language learners

    @web @regression
    Scenario: A Language Learner selects a target language that differs from the source
      Given the source language field shows a declared language
      When the Language Learner selects a different target language
      Then the selected target language is recorded as the translation destination

    @web @regression
    Scenario: Selecting the same language for source and target shows guidance
      Given the source language field shows a declared language
      When the user selects the same language as the target language
      Then a message informs the user that source and target languages are identical

  Rule: Dynamic translation model loading

    @web @smoke
    Scenario: Default translation provider is OpenAI-compatible
      Given the translation configuration step is rendered
      When the user opens the provider dropdown
      Then the OpenAI-compatible option is selected by default

    @web @smoke
    Scenario: Load Model List button populates the Model dropdown for the OpenAI-compatible provider
      Given the OpenAI-compatible provider is selected and an API key is entered
      When the user clicks the "Load Model List" button
      Then the Model dropdown lists models available from the OpenAI-compatible endpoint

    @web @regression
    Scenario: Changing the API key discards the loaded model list
      Given the model list has been loaded for the OpenAI-compatible provider
      When the user changes the API key
      Then the Model dropdown is cleared and the user must reload
