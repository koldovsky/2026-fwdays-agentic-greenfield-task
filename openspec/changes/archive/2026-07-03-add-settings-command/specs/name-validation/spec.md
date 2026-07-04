# name-validation

## Purpose

Pure display-name validation for settings and onboarding reuse (FR-SET-03, NFR-TEST-01).

## ADDED Requirements

### Requirement: Display name validation rules

The system SHALL validate a display name by trimming leading and trailing whitespace, rejecting
an empty result, and rejecting names longer than 40 characters after trim. (FR-SET-03)

#### Scenario: Valid name accepted

- **WHEN** `validate_display_name` is called with « Оленка »
- **THEN** it returns the trimmed value «Оленка»

#### Scenario: Empty after trim rejected

- **WHEN** `validate_display_name` is called with whitespace only or an empty string
- **THEN** it raises a validation error

#### Scenario: Name over 40 characters rejected

- **WHEN** `validate_display_name` is called with a string longer than 40 characters after
  trim
- **THEN** it raises a validation error

#### Scenario: Maximum length accepted

- **WHEN** `validate_display_name` is called with exactly 40 non-whitespace characters
- **THEN** it returns the trimmed value unchanged
