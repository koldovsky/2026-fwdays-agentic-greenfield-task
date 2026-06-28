# Capability 1 — shell

App-wide layout: topbar, main content area, footer, responsive grid, global typography.

**Depends on:** nothing (first capability)  
**Unlocks:** all other capabilities

## Functional requirements

| ID | Description |
|---|---|
| FR-SHELL-01 | Top bar with app name/logo; main content area below |
| FR-SHELL-02 | Responsive at 768 px and 1280 px: mobile single-column, tablet two-column, desktop multi-column grid |

## Business / UX constraints

| ID | Description |
|---|---|
| BC-BRAND-01 | Clean and minimal; content-first, no decorative chrome |
| BC-BRAND-02 | Footer credits PokéAPI with a hyperlink |

## Non-functional requirements

| ID | Description |
|---|---|
| NFR-A11Y-01 | All interactive elements have visible focus styles and accessible names |
| NFR-A11Y-02 | Color palette meets WCAG AA contrast |
| NFR-DX-01 | `npm run lint && tsc --noEmit && npm run build` finish in < 60 s |

## Technical notes

- `app/layout.tsx` is already updated with Hanken Grotesk + JetBrains Mono fonts
- Use DS tokens for all spacing/color (no raw hex/px)
- Sticky topbar: translucent paper fill + `backdrop-filter: blur` (the only blur in the system — see DESIGN.md)
- Responsive grid breakpoints: `--container-max: 1240px`; gutters: `--gutter: 24px`
- Replace the placeholder `app/page.tsx` content with the shell structure
