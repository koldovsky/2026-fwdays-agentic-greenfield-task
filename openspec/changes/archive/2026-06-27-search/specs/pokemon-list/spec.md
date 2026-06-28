## MODIFIED Requirements

### Requirement: Empty state is shown when no Pokémon are available
When the list has no items to display, the page SHALL render an empty state with a descriptive message instead of an empty grid. When the empty state is caused by an active search term, the message SHALL indicate that no Pokémon match the current search, distinct from a data-load failure message.

#### Scenario: Empty state renders on zero results from failed fetch
- **WHEN** the fetched Pokémon list is empty due to a data-load error
- **THEN** the `EmptyState` component is shown with a title and description indicating a load failure

#### Scenario: Empty state renders on zero search results
- **WHEN** the active search term matches no Pokémon in the fetched list
- **THEN** the `EmptyState` component is shown with a message indicating no Pokémon match the search term
