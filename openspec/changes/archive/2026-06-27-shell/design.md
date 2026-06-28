## Context

The design system is fully integrated (tokens, 13 TSX components, fonts). `app/layout.tsx` already loads Hanken Grotesk + JetBrains Mono. `app/page.tsx` is still the Next.js placeholder. No product UI exists yet. This change wires the DS into a real, navigable app shell.

## Goals / Non-Goals

**Goals:**
- Replace the placeholder page with a layout that every subsequent screen renders inside
- Implement top bar (wordmark), main content area, and footer (PokéAPI credit)
- Apply responsive grid container (1 → 2 → 3 → 4 columns at 768 / 1024 / 1280 px)
- Use DS tokens exclusively — no raw hex or px values

**Non-Goals:**
- No Pokémon list, search, filters, or detail content (those are capabilities 2–6)
- No client-side interactivity in the shell itself
- No navigation beyond the single top-bar wordmark link

## Decisions

**1. Shell components are Server Components**
`TopBar` and `Footer` have no interactivity — no `"use client"` needed. Keeps the shell out of the JS bundle.

**2. Layout lives in `app/layout.tsx`, not a new route group**
The shell wraps the entire app; a root layout is the correct Next.js primitive. No need for a route group layout since there is only one layout variant in the MVP.

**3. Component location: `src/components/layout/`**
Shell-specific components (TopBar, Footer) are not DS primitives — they belong in `src/components/layout/` separate from `src/components/ds/`.

**4. Responsive grid as a utility class wrapper, not a DS component**
The grid is a single `<div>` with Tailwind utilities bridged from DS tokens (`max-w-[var(--container-max)]`, `px-[var(--gutter)]`). No need for a dedicated component.

**5. Sticky topbar uses DS-specified blur treatment**
Per DESIGN.md: translucent paper fill + `backdrop-filter: blur` — the only blur in the system. Implemented with Tailwind utilities referencing DS tokens.

## Risks / Trade-offs

- **Risk**: Future screens need a different max-width or gutter → **Mitigation**: use `--container-max` and `--gutter` tokens; one change point.
- **Risk**: `backdrop-filter` not supported in older browsers → **Mitigation**: graceful degradation to solid paper background; acceptable per BC-BRAND-01 (minimal, no decorative reliance on blur).
