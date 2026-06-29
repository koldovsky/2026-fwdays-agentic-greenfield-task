# book-form

## ADDED Requirements

### Requirement: Create a book
The system SHALL offer a form with all book fields and create the book folder + `book.md`
on submit; the slug is auto-generated from the title and editable before saving.

#### Scenario: Slug editable on create
- **WHEN** adding a book
- **THEN** a slug field is shown, prefilled-able, and editable

### Requirement: Edit a book
The system SHALL prefill the form for an existing book and overwrite its metadata + body
on submit; the slug is fixed (not editable) when editing.

#### Scenario: Edit hides the slug field
- **WHEN** editing a book
- **THEN** no slug field is shown

### Requirement: Cover input
The form SHALL accept a cover image upload or a `coverColor` selection.

#### Scenario: Cover color chosen
- **WHEN** no image is uploaded but a cover color is selected
- **THEN** the book stores `coverColor`
