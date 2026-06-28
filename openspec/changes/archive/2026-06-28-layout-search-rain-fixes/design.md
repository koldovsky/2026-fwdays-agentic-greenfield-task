## Context

The weather information view (`Shell` + `RegionGrid`) currently renders three stacked sections — search bar, forecast panel, map — inside a `max-w-[1240px]` container. The map ends up below the fold on any laptop/desktop; users must scroll to see it. The `CitySearch` `select` callback sets `query` to the chosen city name instead of clearing it, so the field shows stale text after every selection. The rain particle animation in `globals.css` uses a `repeating-linear-gradient(173deg …)` tiled at `38px × 38px`; because the angle is slightly off-vertical and the tile is square, the pattern repeats as diagonal bands across the viewport rather than as falling vertical drops.

## Goals / Non-Goals

**Goals:**
- Widen the page container beyond 1240 px so content fills modern wide-screen viewports.
- Restructure `RegionGrid` into two rows: row 1 = search bar (full width); row 2 = forecast block (≈70 %) + map panel (≈30 %), side by side — no vertical scroll when a city is active.
- Clear the search input and close the dropdown immediately after the user selects a city, on both the hero page and the info page.
- Replace the diagonal-stripe rain animation with near-vertical, short-duration falling streaks that read as rain.

**Non-Goals:**
- No changes to forecast data fetching, API routes, or `lib/` pure functions.
- No new map functionality or tile provider changes.
- No changes to Leaflet configuration, chart library, or comfort-score algorithm.
- No mobile-first redesign — the two-column row is a desktop layout; smaller viewports continue to stack vertically.
- No i18n string changes beyond what the layout reflow already makes redundant.

## Decisions

### D1 — Container width: `max-w-screen-2xl` (1536 px)

**Decision**: Replace `max-w-[1240px]` in `Shell` with `max-w-screen-2xl` (Tailwind's `1536px` breakpoint alias).

**Rationale**: 1536 px fills a 1920 px monitor at ≈ 80 % width with comfortable side margins — enough room for the 70/30 column split to breathe. Going fully uncapped (`max-w-full`) would stretch the layout uncomfortably on ultra-wide displays.

**Alternative considered**: Custom `max-w-[1600px]` — functionally identical; `max-w-screen-2xl` is a standard Tailwind token, no magic number needed.

### D2 — Row-2 grid: CSS Grid with `grid-cols-[70%_30%]`

**Decision**: Replace the `flex-col` in `RegionGrid` with:
- Outer: `flex flex-col gap-4` (two rows).
- Row 1: search bar (`<div>` full-width, no change structurally).
- Row 2: `<div className="grid grid-cols-[70%_30%] gap-4 min-h-0">` containing the forecast `<section>` and the map `<section>`.

**Rationale**: A two-column CSS Grid is the simplest correct tool. The explicit `[70%_30%]` matches the product requirement precisely. `min-h-0` is needed so Grid children can shrink inside a flex container (avoids overflow issues).

**Viewport fit — no vertical scroll**: Wrap `<main>` in `h-[calc(100vh-<topbar-height>)] overflow-hidden` (or equivalent) so both rows fit within the available window height when a city is active. The exact topbar height is currently `~56px`; use the `--top-bar-h` CSS custom property (or measure and define it).

**Alternative considered**: Flexbox row for the two columns — works identically but `grid-cols-[70%_30%]` is more declarative and easier to adjust at breakpoints.

### D3 — Search reset: clear `query` on selection

**Decision**: In `CitySearch.tsx`, inside the `select` callback, replace `setQuery(result.name)` with `setQuery("")`. The `setSuggestions([])` and `setIsOpen(false)` calls already present remain unchanged.

**Rationale**: The existing line `setQuery(result.name)` was written to show the selected city in the input — a common pattern — but it conflicts with the desired UX where each search is a zero-to-zero discrete flow. Clearing the query string drops the debounce effect from running again (query = "" → 0 ms timeout → empty suggestions, already handled), so no other state changes are needed.

**Applies to both views**: `CitySearch` is the same component on the hero page and the info page; fixing the callback fixes both.

### D4 — Rain animation: switch to `180deg` vertical streaks

**Decision**: Replace the current `repeating-linear-gradient(173deg …)` rain rule with a pure `180deg` (top-to-bottom) variant. Use a **rectangular** background tile (e.g. `20px × 40px`) so vertical repetition naturally creates columns of short streaks with gaps between them, avoiding the diagonal aliasing caused by the off-angle gradient inside a square tile.

**Rationale**: The 173deg angle, tiled in a 38 × 38 square, creates a Moiré-like diagonal banding because each tile's gradient edge does not align with the next tile's left edge. A 180deg gradient inside a rectangular tile repeats cleanly as vertical lines — matching the visual expectation of rainfall.

**Optional enhancement**: Use two stacked layers with slightly different tile widths and vertical offsets to give the rain depth and avoid a too-regular comb pattern. This is an implementation detail for the apply step.

**prefers-reduced-motion**: No change needed — the existing media query in `globals.css` already disables the animation for the `.bg-anim-rain-particles` class. The selector remains intact.

## Risks / Trade-offs

- **`calc(100vh - topbar)` viewport fit**: If `TopBar` height ever changes, the layout may clip or show a gap. Mitigation: define a `--top-bar-h` CSS variable in `TopBar` or measure via layout (the current topbar has a fixed `h-14` / 56 px class — pin the constant as a token).
- **Map height in the 30 % column**: The `<Map>` component's inner Leaflet container needs an explicit height; giving the map section `h-full` inside the grid may not propagate to the Leaflet `div`. Mitigation: set a minimum height (`min-h-[400px]`) on the map section and let it fill the row remainder.
- **Very small desktop viewports (< 900 px wide)**: The 70/30 split at `max-w-screen-2xl` still produces acceptably sized columns at 1024 px. Below ~900 px consider stacking; the existing single-column breakpoint (< 768 px, FR-SHELL-02) already handles mobile.
- **Rain animation performance**: Multi-layer `background-image` gradients animated via `background-position` are GPU-composited (`will-change: background-position`) and have negligible CPU overhead. No risk introduced versus the current single-layer approach.

## Migration Plan

1. Update `Shell.tsx`: change `max-w-[1240px]` to `max-w-screen-2xl`; add viewport-fit wrapper when `hasActiveLocation`.
2. Update `RegionGrid` in `Shell.tsx`: restructure to two rows with Grid column split.
3. Update `CitySearch.tsx`: change `setQuery(result.name)` to `setQuery("")` in `select`.
4. Update `globals.css` rain rule: replace the `173deg` gradient and `38px 38px` tile with `180deg` rectangular tiles.
5. Run `tsc --noEmit`, `eslint`, `prettier --check`, and `vitest` to confirm no regressions.
6. Verify visually with the Playwright/browser MCP tool: open a city, confirm no scroll, search bar clears, rain animation looks correct.

No rollback complexity — all changes are purely frontend CSS/TSX edits with no data-contract changes.

## Open Questions

- Should the viewport-fit wrapper (`overflow-hidden`) be applied globally (in `app/layout.tsx`) or only in `Shell` when `hasActiveLocation`? The latter is safer — the hero/home page should still allow scroll if viewport is short.
- What is the exact height of `TopBar`? Confirm it is `h-14` (56 px) before hardcoding the CSS variable.
