@feature:[F3]
Feature: HTML-Aware Translation Pipeline
  As a Language Learner
  I want chapter text translated sentence-by-sentence while preserving structural HTML formatting
  So that I can read translated chapters with intact layout, structure, and emphasis

  #
  # Personas: Language Learner (primary), Content Creator
  # Dependencies: F1, F2
  # Assumption: the source/target language pair is supported by the selected provider/model.

  Rule: Structural HTML tag preservation

    @api @smoke
    Scenario: Translated chapter retains at least 95% of structural HTML tags
      Given a running translation job for a source chapter containing structural HTML tags from the set {<p>, <h1>-<h6>, <ul>, <ol>, <li>, <em>, <strong>, <a>}
      When the pipeline completes translation of the chapter
      Then at least 95% of those structural tags, matched by name and occurrence in the source, are present in the translated chapter
      And the tag-integrity diff reports no deficit for the chapter

    @api @regression
    Scenario: Exactly 95% of structural tags preserved is accepted at the threshold
      Given a running translation job for a source chapter containing 20 structural HTML tags from the canonical set
      When the pipeline completes translation producing 19 of those structural tags by name and occurrence
      Then the chapter meets the 95% preservation threshold
      And no tag-integrity failure is recorded for the chapter

    @api @regression
    Scenario: Translated chapter missing more than 5% of structural tags is rejected
      Given a running translation job for a source chapter containing 20 structural HTML tags from the canonical set
      When the pipeline completes translation producing 18 of those structural tags by name and occurrence
      Then the tag-integrity diff reports a preservation deficit for the chapter
      And the chapter is not counted as translated

  Rule: Sentence-bounded chunking

    @integration @smoke
    Scenario: A 100-sentence chapter is processed with one provider call per chunk
      Given a chapter containing 100 sentences submitted to a running translation job
      When the pipeline processes the chapter in sentence-bounded chunks
      Then the number of translation-provider calls equals the number of chunks
      And each chunk results in at most one translation-provider request

    @integration @regression
    Scenario: A single-sentence chapter yields one chunk and one provider call
      Given a chapter containing one sentence submitted to a running translation job
      When the pipeline processes the chapter
      Then exactly one sentence-bounded chunk is produced
      And exactly one translation-provider call is made for that chunk

    @integration @regression
    Scenario: Chunk boundaries never split a sentence across two provider calls
      Given a chapter containing 100 sentences submitted to a running translation job
      When the pipeline processes the chapter in sentence-bounded chunks
      Then every provider call request body contains only whole sentences
      And no sentence is divided between two translation-provider calls

  Rule: Provider call timeout handling

    @integration @smoke
    Scenario: A provider call that exceeds 60 seconds is aborted and retried once successfully
      Given a running translation job processing a chunk whose first translation-provider call has not returned within 60 seconds
      When the first call is aborted and retried once
      Then the retry call returns within 60 seconds
      And the chunk is translated

    @integration @regression
    Scenario: A second provider-call timeout marks the chunk and the job as failed
      Given a running translation job where the initial chunk call and its single retry both exceed 60 seconds without returning
      When the retry call is aborted
      Then the chunk is marked as failed
      And the job transitions to a failed state
      And the job's error envelope reports error code "provider_timeout"

    @integration @regression
    Scenario: A provider call returning within 60 seconds is not aborted
      Given a running translation job processing a chunk whose translation-provider call returns at 59 seconds
      When the call returns
      Then the call is not aborted
      And no retry is issued for that chunk

  Rule: Per-chapter progress reporting

    @api @smoke
    Scenario: A progress event is emitted when a chapter completes translation
      Given a running translation job with a chapter currently being translated
      When the chapter completes translation
      Then a per-chapter progress event is emitted reporting that chapter as completed

    @api @regression
    Scenario: A progress event is emitted when a chapter fails by provider timeout
      Given a running translation job where a chapter has exceeded the provider timeout on both the initial call and its retry
      When the chapter is marked as failed
      Then a per-chapter progress event is emitted reporting that chapter as failed
