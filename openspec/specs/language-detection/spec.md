# language-detection

## Purpose

A single shared detector for the prose language to mirror back to the user (invariant #6).
`detectLang(text: string): Lang`, with `type Lang = 'uk' | 'ru' | 'en'`, lives in
`src/util/lang.ts` and is the one home for the detection rules (Ukrainian-specific letters,
generic Cyrillic, Latin/default) that every user-facing surface — food logging, body metrics,
nutrition query, and future surfaces — imports rather than reimplementing.

## Requirements

### Requirement: Prose-language detection is single-sourced

The system SHALL expose one shared detector, `detectLang(text: string): Lang` with
`type Lang = 'uk' | 'ru' | 'en'`, from `src/util/lang.ts`. Every user-facing surface that
mirrors the user's language in prose (invariant #6) SHALL import this detector; no module SHALL
define its own copy of the type, the detection function, or the underlying character regexes.

#### Scenario: Ukrainian detected via Ukrainian-specific letters

- **WHEN** `detectLang` receives text containing any of `і`, `ї`, `є`, `ґ` (any case)
- **THEN** it returns `'uk'`

#### Scenario: Russian detected via Cyrillic without Ukrainian letters

- **WHEN** `detectLang` receives Cyrillic text (`а-яё`, any case) containing none of `іїєґ`
- **THEN** it returns `'ru'`

#### Scenario: English is the default

- **WHEN** `detectLang` receives text with no Cyrillic characters (e.g. Latin text, digits, empty)
- **THEN** it returns `'en'`

#### Scenario: Ukrainian letters win over generic Cyrillic

- **WHEN** `detectLang` receives text containing both a Ukrainian-specific letter and other
  Cyrillic letters (e.g. `їжа`)
- **THEN** it returns `'uk'` (the Ukrainian check precedes the Russian check)

### Requirement: Extraction preserves observable behavior

The detector's behavior after extraction SHALL be byte-for-byte identical to the three copies it
replaces. The food-logging, body-metrics, and nutrition-query surfaces SHALL produce the same
language-selected prose as before, and their existing test suites SHALL stay green with no change.

#### Scenario: Existing surface behavior unchanged

- **WHEN** the food, metrics, and query confirmation/answer paths select prose language after the
  extraction
- **THEN** the selected `Lang` for any given input matches the pre-extraction result, and the
  food/metrics/query suites pass without modification
