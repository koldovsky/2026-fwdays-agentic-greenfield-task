## Context

The repository contains a bare Next.js 16 scaffold (`create-next-app`) with default English marketing content, minimal CSS variables, and no component library. Requirements FR-SHELL-01/02/03, NFR-I18N-01, BC-BRAND-01/02, and TC-STACK-02 define what Phase 1 must deliver. Root `DESIGN.md` is the visual source of truth for tokens, layout zones, and Ukrainian copy examples.

Downstream capabilities (`top-clock`, `route-input`, `map-rendering`, `route-details`) will plug into header slots and the main content area without restructuring the shell.

## Goals / Non-Goals

**Goals:**

- Deliver a runnable Ukrainian-first SPA shell with header, main, and footer
- Establish CSS variable theme tokens (light/dark) and a working theme toggle
- Initialize shadcn/ui with Tailwind 4 and expose Button, Input, Label, Card
- Provide a typed local i18n dictionary for all shell strings
- Show centered empty-state config card placeholder (no route logic yet)
- Meet responsive breakpoints at 768 px and 1280 px
- Include OSM/OSRM footer attribution with external links

**Non-Goals:**

- Live header clock (Phase 2 — `top-clock`)
- Route search fields, URL sync, or validation (Phase 3 — `route-input`)
- Map, sidebar itinerary, or routing logic
- Vitest setup or Lighthouse gates (Phase 8 — `quality-gate`)
- Analytics, cookies, or persistent client storage

## Decisions

### 1. Component file structure

```
components/
  layout/
    app-shell.tsx      # flex column: header + main + footer
    site-header.tsx    # logo, clock slot, theme toggle slot
    site-footer.tsx    # attribution links
  theme/
    theme-provider.tsx # class-based dark mode on <html>
    theme-toggle.tsx   # client toggle button
  empty-state/
    config-panel.tsx   # Card with heading + placeholder copy
  ui/                  # shadcn primitives (button, input, label, card)
lib/
  i18n/
    uk.ts              # flat dictionary
    index.ts           # typed t() helper
  utils.ts             # cn() from shadcn
```

**Rationale:** Flat, discoverable paths. Later phases add `components/clock/`, `components/route-input/` without touching layout.

**Alternative considered:** Colocate everything in `app/` — rejected because shared components belong outside the route tree.

### 2. Theme implementation — class strategy on `<html>`

Use a client `ThemeProvider` that toggles `class="dark"` on the document element. Default follows `prefers-color-scheme` until the user toggles; preference stored in `localStorage` key `motroute-theme` (theme choice only — not route data, compliant with BC-PRIVACY-02).

CSS variables defined in `globals.css` for both `:root` and `.dark`, mapped via `@theme inline` per DESIGN.md hex values.

**Alternative considered:** `next-themes` package — rejected to avoid extra dependency for a single toggle.

### 3. shadcn/ui initialization

Run `npx shadcn@latest init` with New York style, CSS variables, and `@/` alias (already in tsconfig). Add components: `button`, `input`, `label`, `card`.

Configure `next.config.ts`:

```ts
experimental: { optimizePackageImports: ['lucide-react'] }
```

**Rationale:** TC-STACK-02; aligns with DESIGN.md component table.

### 4. i18n — static module, no middleware

Single `lib/i18n/uk.ts` object with nested keys (`shell.title`, `empty.heading`, `footer.osm`, etc.). Export `t(key)` with TypeScript keyof typing. Components import directly — no `next-intl`, no `[locale]` routing.

**Rationale:** NFR-I18N-01 explicitly forbids runtime middleware. MVP is Ukrainian-only.

### 5. Layout composition in `app/layout.tsx`

- Set `lang="uk"` on `<html>`
- Wrap children in `ThemeProvider`
- Metadata: title "MotoRoute", description in Ukrainian
- Keep Geist font variables from scaffold

`app/page.tsx` renders `<AppShell>` with empty-state config panel in main.

### 6. Responsive behavior

| Breakpoint | Tailwind | Shell behavior |
| ---------- | -------- | -------------- |
| < 768px | default | Full-width config card, `px-4`, stacked header items if needed |
| ≥ 768px | `md:` | Header single row; config card `max-w-lg` centered |
| ≥ 1280px | `xl:` | Same empty state; wider horizontal padding `p-6` |

Main area uses `flex-1 flex items-center justify-center min-h-0` for vertical centering of empty state. Results-state map+sidebar layout deferred to later phases but main wrapper accepts `children` pattern.

### 7. Header slots for downstream work

Header renders:
- Left: text wordmark "MotoRoute" (BC-BRAND-01)
- Center/right: `{clockSlot}` prop (null for now — `top-clock` fills later)
- Right: `<ThemeToggle />`

Use optional React `children` or named slot props to avoid rework in Phase 2.

### 8. Footer attribution

Single muted line in `site-footer.tsx`:

- Link to OpenStreetMap copyright page
- Link to OSRM project site

Both `target="_blank"` `rel="noopener noreferrer"`. Copy from `lib/i18n/uk.ts`.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Theme flash on first paint | Inline blocking script in layout (DESIGN.md §6.5 pattern) sets `dark` class before hydration if localStorage or prefers-color-scheme says dark |
| shadcn CLI version drift | Pin component code in repo; document init flags in tasks |
| localStorage for theme vs BC-PRIVACY-02 | Theme preference is UX-only, not profile tracking; documented as acceptable exception |
| Empty config panel looks incomplete without inputs | Show heading + calm helper text per DESIGN.md; actual fields arrive in `route-input` |
| Over-scoping foundation | Strict non-goals list; no clock, no geocoding, no map imports |

## Migration Plan

1. Initialize shadcn and theme tokens (non-breaking additive)
2. Add layout components alongside existing page
3. Replace `app/page.tsx` content (removes default Next.js marketing — **BREAKING** for demo page only)
4. Verify `npm run build` passes
5. Manual check: responsive at 375px, 768px, 1280px; theme toggle; footer links

Rollback: revert to scaffold page if needed — no data migration.

## Open Questions

- None blocking. Clock slot API (`children` vs prop) — use `children` in header for clock injection in Phase 2.
