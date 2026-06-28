# Spec: Pagination

## Purpose

Defines the requirements for paginated navigation on the Pokémon list page (`/pokemon`), including pagination controls, URL persistence of the active page, and page-reset behavior when search or filters change.

## Requirements

### Requirement: Pagination controls navigate between pages
The app SHALL render pagination controls at the bottom of the Pokémon list when `totalPages > 1`. Controls SHALL include a previous button, numbered page buttons (with ellipsis collapsing for large page counts), and a next button. The previous button SHALL be disabled on page 1; the next button SHALL be disabled on the last page.

#### Scenario: Controls appear when results span multiple pages
- **WHEN** the filtered Pokémon list has more than 20 results
- **THEN** pagination controls are visible below the card grid

#### Scenario: Controls hidden when results fit on one page
- **WHEN** the filtered Pokémon list has 20 or fewer results
- **THEN** no pagination controls are rendered

#### Scenario: Previous disabled on first page
- **WHEN** the current page is 1
- **THEN** the previous button is in a disabled state and cannot be clicked

#### Scenario: Next disabled on last page
- **WHEN** the current page equals totalPages
- **THEN** the next button is in a disabled state and cannot be clicked

#### Scenario: Clicking a page number navigates to that page
- **WHEN** the user clicks a numbered page button
- **THEN** the URL is updated to `?page=N` (preserving all other params) and the corresponding 20-item slice is displayed

#### Scenario: Clicking next advances one page
- **WHEN** the user clicks the next button while not on the last page
- **THEN** the URL is updated to `?page=<current+1>` and the next 20-item slice is displayed

#### Scenario: Clicking previous goes back one page
- **WHEN** the user clicks the previous button while not on page 1
- **THEN** the URL is updated to `?page=<current-1>` and the previous 20-item slice is displayed

### Requirement: Current page is reflected in the URL
The active page number SHALL be reflected in the URL as `?page=N` (1-based). When `?page=` is absent or contains a non-positive integer, the app SHALL default to page 1. When `?page=N` exceeds `totalPages`, the app SHALL redirect to `?page=<totalPages>` (or page 1 if there are no results).

#### Scenario: URL contains page param after navigation
- **WHEN** the user navigates to page 3
- **THEN** the URL contains `?page=3`

#### Scenario: Missing page param defaults to page 1
- **WHEN** a visitor loads `/pokemon` without a `?page=` param
- **THEN** page 1 is shown

#### Scenario: Invalid page param defaults to page 1
- **WHEN** a visitor loads `/pokemon?page=abc` or `/pokemon?page=0`
- **THEN** page 1 is shown

#### Scenario: Out-of-range page redirects to last page
- **WHEN** a visitor loads `/pokemon?page=99` and there are only 4 pages of results
- **THEN** the app redirects to `?page=4` and shows the last page of results

### Requirement: Changing search or any filter resets the page to 1
When the user modifies the search term or any filter (type, generation, legendary), the `?page=` param SHALL be reset to 1 in the same URL push. This prevents landing on a page that no longer exists after the result set changes.

#### Scenario: Search change resets page
- **WHEN** the user types in the search input while on page 3
- **THEN** the URL is updated to `?search=<term>&page=1` (other params preserved) and page 1 is displayed

#### Scenario: Filter change resets page
- **WHEN** the user selects a type filter while on page 3
- **THEN** the URL is updated with the new filter param and `page=1`, and page 1 is displayed
