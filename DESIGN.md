# Pokédex Explorer — Design System

Source of record: `docs/Pokédex Explorer Design System.zip`

---

## Brand personality

Restrained and editorial. The UI is near-monochrome; **Pokémon artwork is the only real color** on a typical screen. The 18 type hues appear only as small badges. Nothing competes with the content.

---

## Color

All colors come from CSS custom properties. Never introduce raw hex values.

**Neutral ramp** (`--ink-0` → `--ink-950`) — a subtly warm gray. Page background is `--paper` (`#fbfbf9`).

**Semantic tokens** (use these in components):

| Token | Purpose |
|---|---|
| `--text-primary` | Main body text |
| `--text-secondary` | Supporting text |
| `--text-tertiary` | Placeholders, labels |
| `--surface-card` | Card backgrounds |
| `--surface-hover` / `--surface-active` | Interactive states |
| `--border-subtle` / `--border-default` / `--border-strong` | Borders |
| `--action-primary` | Primary button fill |
| `--legendary` | Legendary/Mythical accent (metallic) |

**Type colors** — available as `--type-{name}`, `--type-{name}-bg`, `--type-{name}-text`. Use only via `<TypeBadge>`. Never apply type colors to non-badge elements.

---

## Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display | Hanken Grotesk | 800 | `--tracking-tighter`, large headings |
| Heading | Hanken Grotesk | 700 | `--tracking-tight` |
| Body | Hanken Grotesk | 400 | `--leading-normal` |
| Labels / eyebrows | JetBrains Mono | 500 | UPPERCASE, `--tracking-wider` |
| Data (dex numbers, stats) | JetBrains Mono | 400–500 | tabular-nums |

**Casing:** Sentence case everywhere in sans. UPPERCASE in mono labels only.

**Dex numbers:** always zero-padded to 4 digits with leading `#` — e.g. `#0025`.

---

## Spacing & layout

- 4px base grid (`--space-1` = 4px, `--space-2` = 8px, …)
- Content column: `--container-max: 1240px`, centered
- Responsive grid: 1 col → 2 col (≥768px) → 3 col (≥1024px) → 4 col (≥1280px)
- Gutters: `--gutter: 24px`, `--gutter-sm: 16px`

---

## Components

All 13 components live in `src/components/ds/`. Import from the barrel:

```ts
import { Button, TypeBadge, PokemonCard } from "@/components/ds";
```

| Component | Category | Directive | Purpose |
|---|---|---|---|
| `Button` | core | `"use client"` | Primary / secondary / ghost actions |
| `IconButton` | core | `"use client"` | Square icon-only button |
| `Input` | core | `"use client"` | Single-line text field with label/hint/error |
| `SearchInput` | core | `"use client"` | Debounced name search with clear button |
| `Select` | core | `"use client"` | Native select with mono label and chevron |
| `Checkbox` | core | `"use client"` | Ink-fill checkbox with optional label |
| `Switch` | core | `"use client"` | Toggle for binary on/off filters |
| `Badge` | data-display | Server | Mono-uppercase status pill (non-type metadata) |
| `TypeBadge` | data-display | Server | Colored elemental-type pill; selectable mode for filters |
| `Card` | data-display | Server | Base bordered panel, optional hover lift |
| `PokemonCard` | data-display | Server | List-grid tile: artwork + dex number + name + types |
| `StatBar` | data-display | Server | Single base-stat row with fill bar |
| `EmptyState` | feedback | Server | Centered empty/no-results state |
| `Pagination` | navigation | `"use client"` | Previous / numbered pages / next |

---

## Adherence rules

1. **No raw hex colors.** Use `var(--ink-900)`, not `#1a1a17`.
2. **No raw px values in source.** Use `var(--space-4)`, not `16px`.
3. **No new accent colors.** The palette is closed. Type color only via `<TypeBadge>`.
4. **Icons from Lucide only** — 1.75 stroke, `currentColor`, 24×24. No emoji, no Unicode as icon.
5. **Import from `@/components/ds`**, not from component internals.
6. **Sentence case** in sans-serif copy. UPPERCASE only in mono eyebrow labels.
