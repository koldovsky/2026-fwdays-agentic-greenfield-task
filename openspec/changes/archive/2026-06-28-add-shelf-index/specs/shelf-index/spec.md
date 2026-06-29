# Shelf index

## ADDED Requirements

### Requirement: Shelves grouped by tag
The system SHALL render one shelf per tag (via the C8 grouping), with a book
appearing under each of its tags.

#### Scenario: Empty library
- **WHEN** there are no books
- **THEN** an empty state invites adding the first book

#### Scenario: Multi-tag book on multiple shelves
- **WHEN** a book has more than one tag
- **THEN** it appears as a card under each of its tag shelves

### Requirement: Book card with navigation
Each book SHALL render as a Design-System `BookCard` (cover/coverColor, title,
author, rating, status) that links to `/book/<slug>`.

#### Scenario: Card links to the book
- **WHEN** clicking a book card
- **THEN** the user navigates to that book's page at `/book/<slug>`

### Requirement: Add book entry point
The screen SHALL offer an "Add book" action linking to `/book/new`.

#### Scenario: Add book action
- **WHEN** the user activates the "Add book" action
- **THEN** the user navigates to `/book/new`
