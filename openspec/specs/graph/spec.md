# graph Specification

## Purpose
A page visualizing the book/note link graph as a chord diagram.
## Requirements
### Requirement: Connection graph page
The system SHALL provide a `/graph` page that renders an undirected book-level link
graph: an edge connects two books when a note in one references the other (or one of its
notes). Self-links and links to non-existent books are excluded, and only books with at
least one connection are shown.

#### Scenario: Linked books appear as connected nodes
- **WHEN** a note in book A references book B
- **THEN** the graph shows nodes for A and B joined by an edge

#### Scenario: Nodes link to book pages
- **WHEN** the user activates a node
- **THEN** the browser navigates to that book's page at `/book/<slug>`

#### Scenario: Empty graph
- **WHEN** no notes reference other books
- **THEN** the page shows an empty state instead of a graph

### Requirement: Graph entry point
The shelf SHALL offer a link to the graph page.

#### Scenario: Open the graph from the shelf
- **WHEN** the user activates the "Graph" action on the shelf
- **THEN** the browser navigates to `/graph`

