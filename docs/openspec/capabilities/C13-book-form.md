# C13 — Book Form

**OpenSpec change:** `add-book-form`
**Owner:** `app/book/new`, `app/book/[slug]/edit`, `components/BookForm`
**Depends on:** C9 (Server Actions), C10 (DS Integration), C4 (Book Store)
**Maps to:** requirements.md §3.3

## Purpose
Create and edit a book through a DS-styled form (Input/Select/Textarea/Button) that
posts to the server actions.

## Requirements

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
