# Product Brief — Pokémon Explorer

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.

## What this is

Pokémon Explorer is a clean, minimal web app for browsing the full Pokédex.
It lets a visitor search for any Pokémon by name, narrow the list by type,
generation, or legendary status, and open a detail page with the complete
characteristics for that Pokémon. There are no accounts, no cookies, no
trackers, and no paid API keys. All data comes from the free, keyless PokéAPI.

## Who it is for

The single actor is an **anonymous visitor curious about Pokémon**. There are
no roles, no sign-in, and no stored profile. The visitor arrives, explores,
and leaves; nothing about them is persisted anywhere.

## The pain it addresses

Looking up Pokémon characteristics across the web means navigating ad-heavy
fan sites, dealing with pop-ups, or parsing raw JSON from the API directly.
None of those give a clean, fast, focused view.

This product reduces it to a single minimal screen: search or filter to find a
Pokémon, click to read everything about it, go back. No distractions.

## End-to-end usage

1. **Land.** The visitor sees a grid of Pokémon cards with a search input and
   filter controls at the top (FR-SHELL-01, FR-SHELL-02). All 1025+ Pokémon
   are available, paginated 20 per page (FR-LIST-01).
2. **Find a Pokémon.** The visitor can:
   - Type a name into the search input; the list filters in real time, debounced
     (FR-SEARCH-01). The search term lives in the URL (FR-SEARCH-02).
   - Select one or more types from the type multi-select to see only Pokémon
     of those types (FR-FILTER-01).
   - Pick a generation (Gen 1–9) to narrow by era (FR-FILTER-02).
   - Toggle the Legendary / Mythical filter to surface only rare Pokémon
     (FR-FILTER-03).
   - All active filters are reflected in the URL, making any view shareable
     and bookmarkable (FR-FILTER-04).
3. **Browse pages.** Pagination controls at the bottom let the visitor move
   through results; the current page is part of the URL (FR-PAGE-01, FR-PAGE-02).
4. **Read the details.** Clicking a card opens `/pokemon/[id]` with the full
   profile: large official artwork, dex number, name, genus, types, Pokédex
   flavor text, base stats, abilities, height, weight, generation, and a
   Legendary / Mythical label where applicable (FR-DETAIL-01 through FR-DETAIL-08).
5. **Go back.** The back link returns to the list with the previous search,
   filters, and page intact (FR-DETAIL-09).

## Key workflows in prose

- **Find and read one Pokémon.** Type the name, click the card, read the stats.
  The core loop — everything else supports it.
- **Browse by type.** Select Fire (or Fire + Flying) and page through the
  results to compare Pokémon of a given type at a glance.
- **Narrow to a generation.** Pick Gen 1 to see only the original 151, or Gen 5
  to explore a less familiar era.
- **Share a filtered view.** Because all state is in the URL, the visitor can
  copy the address bar and send a pre-filtered list to someone else.

## MVP vs Future boundary

**In the MVP:** the full Pokédex grid, name search, type / generation /
legendary filters, pagination, and the detail page with complete
characteristics — all keyless, all privacy-first.

**Future (deferred):**

- Favorites, history, or any personalization persisted client- or server-side
- Pokémon comparison view
- Evolution chain display
- Move list
- Location / encounter data
- Non-English language support
- Native mobile app

## Operating principles

- **Privacy-first.** No analytics, no third-party trackers, no fingerprinting,
  no application-set cookies (BC-PRIVACY-01, BC-PRIVACY-02).
- **Keyless and free.** Zero paid API keys; all data from PokéAPI (TC-STACK-03).
  The footer credits PokéAPI (BC-BRAND-02).
- **Honest under failure.** No API error produces a silent blank; failures
  degrade to a visible, calm state. The runtime console stays silent on a
  healthy session (NFR-OBS-01).
- **Clean and minimal.** Content-first design with no decorative chrome
  (BC-BRAND-01).
