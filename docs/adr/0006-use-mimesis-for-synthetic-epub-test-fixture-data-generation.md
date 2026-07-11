# Use mimesis for synthetic EPUB test fixture data generation

## Context and Problem Statement

Phase 1 ships synthetic EPUB fixtures for BDD acceptance tests and judge demos (see `docs/features/epub-upload-and-validation.feature`). Fixtures must be deterministic and hermetic (no external downloads), support multi-language content (French, English, multi-language readers) to exercise the `declared_languages` metadata path, and scale to a 120-chapter book without bloating the repo or slowing CI. The `tools/build_fixtures.py` generator needs a fake-data library to produce localized chapter prose. Which Python fake-data generator should we standardize on for EPUB test content?

## Considered Options

* mimesis
* Faker
* Hypothesis (property-based generation)
* Hand-rolled prose generator (no dependency)

## Decision Outcome

Chosen option: "mimesis", because it is widely recognized as the fastest Python data generator, which matters when regenerating a 120-chapter EPUB on every CI run. It provides multi-locale `Text` / `Paragraph` providers covering French and English out of the box (satisfying the bilingual-reader and multi-language metadata scenarios), supports deterministic seeded output for hermetic tests, and keeps the generator script small. Faker is simpler and more familiar but materially slower for bulk generation; Hypothesis targets edge-case discovery rather than bulk prose; a hand-rolled generator reinvents localized text and adds maintenance burden.

### Consequences

* Good, because bulk EPUB regeneration in CI stays fast even at 120 chapters.
* Good, because deterministic seeding preserves hermetic, reproducible fixtures.
* Good, because built-in locales (fr, en) directly support the F1 multi-language metadata scenarios.
* Bad, because mimesis is less widely used than Faker, so contributors may need to learn its provider API.
* Bad, because locale provider coverage is narrower than Faker's long tail of languages, which could matter if future phases add non-fr/en fixtures.
