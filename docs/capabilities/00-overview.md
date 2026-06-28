# Capabilities — Implementation Order

Each capability maps to one OpenSpec change. Implement in the order below; each depends on the previous.

| # | Capability | Key requirements | Depends on |
|---|---|---|---|
| 1 | [shell](./01-shell.md) | FR-SHELL-01/02, BC-BRAND-02 | — |
| 2 | [pokemon-list](./02-pokemon-list.md) | FR-LIST-01..04 | shell |
| 3 | [pokemon-detail](./03-pokemon-detail.md) | FR-DETAIL-01..09 | pokemon-list |
| 4 | [search](./04-search.md) | FR-SEARCH-01..03 | pokemon-list |
| 5 | [filters](./05-filters.md) | FR-FILTER-01..05 | search |
| 6 | [pagination](./06-pagination.md) | FR-PAGE-01..02 | filters |

## Rationale

- **shell first** — all screens render inside it; sets up layout, topbar, footer, responsive breakpoints
- **pokemon-list second** — the core screen; establishes the PokéAPI data-fetching pattern (Server Components) that every other capability reuses
- **pokemon-detail third** — completes the core loop (browse → click → read → back); self-contained, needs only an id param
- **search fourth** — first URL-state feature; filters the existing list by name
- **filters fifth** — adds type/generation/legendary URL params on top of search; depends on the URL-state pattern established by search
- **pagination last** — depends on the full filter set being stable (FR-PAGE-02: any filter change resets to page 1)

## Shared constraints applied to all capabilities

- All PokéAPI calls in Server Components or Route Handlers (TC-DATA-01)
- UI strings in `lib/i18n/en.ts` — no hardcoded copy in components (TC-I18N-01)
- `lib/` must stay framework-free (TC-PURE-01)
- No analytics, cookies, or trackers (BC-PRIVACY-01/02)
- Console silent at runtime (NFR-OBS-01)
- WCAG AA contrast + visible focus styles (NFR-A11Y-01/02)
