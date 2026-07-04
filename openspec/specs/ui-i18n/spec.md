# ui-i18n

## Purpose

Local Ukrainian UI dictionary and document language declaration for MotoRoute shell copy.

## Requirements

### Requirement: Local Ukrainian UI dictionary

All user-visible shell strings SHALL be sourced from a local translation module. The module MUST NOT depend on runtime i18n middleware, locale routing, or external translation services.

#### Scenario: Shell copy from dictionary

- **WHEN** any shell component renders user-visible text
- **THEN** the text is retrieved from the local Ukrainian dictionary module

#### Scenario: No i18n middleware

- **WHEN** the application builds and runs
- **THEN** no Next.js i18n middleware or `[locale]` route segments are present

### Requirement: Document language declaration

The HTML document root MUST declare Ukrainian as the page language.

#### Scenario: Language attribute

- **WHEN** the page HTML is rendered
- **THEN** the `<html>` element has `lang="uk"`

### Requirement: Calm Ukrainian tone

UI copy in the dictionary MUST use a calm, practical, informative tone in Ukrainian. Copy MUST NOT contain exclamation marks.

#### Scenario: Empty state heading tone

- **WHEN** the empty-state configuration panel heading is displayed
- **THEN** the text is in Ukrainian with no exclamation marks

#### Scenario: Page metadata

- **WHEN** the document title and description are set
- **THEN** they use Ukrainian branding appropriate to a motorcycle route planner
