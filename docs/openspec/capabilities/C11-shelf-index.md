# C11 — Shelf / Index

**OpenSpec change:** `add-shelf-index`
**Owner:** `app/page.tsx`, `components/TagShelf`, `components/BookCardLink`
**Depends on:** C8 (Queries), C10 (Design-System Integration)
**Maps to:** requirements.md §3.1

## Purpose
The home screen: all books grouped into shelves by tag, each book a DS `BookCard`
linking to its page. First useful demo slice of the app.

## Requirements

### Requirement: Shelves grouped by tag
The system SHALL render one shelf per tag (via C8 grouping), a book appearing under
each of its tags.

#### Scenario: Empty library
- **WHEN** there are no books
- **THEN** an empty state invites adding the first book

### Requirement: Book card with navigation
Each book SHALL render as a DS `BookCard` (cover/coverColor, title, author, rating,
status) that links to `/book/<slug>`.

#### Scenario: Card links to the book
- **WHEN** clicking a book card
- **THEN** the user navigates to that book's page

### Requirement: Add book entry point
The screen SHALL offer an "Add book" action linking to `/book/new`.
