---
name: prokhidnyi-design-system
description: Apply the Prokhidnyi design system (DESIGN.md) when building or changing any UI in this repo. Use whenever writing/editing components, pages, styles, or markup — buttons, cards, pills, rings, tabs, modals, tables, forms, colors, typography, spacing. Enforces the --pk-* tokens, .pk-* component classes, the two-font split, and the green/amber/red traffic-light chance code.
metadata:
  type: reference
  source: DESIGN.md
---

# Prokhidnyi Design System

The visual language for Prokhidnyi. **The CSS in `docs/design-system/` is the source
of truth** — read `DESIGN.md` for the full narrative. This skill is the working
checklist for producing on-system UI.

When code and this doc disagree, the CSS wins.

## Before you build

1. Read `DESIGN.md` and skim the relevant CSS in `docs/design-system/`
   (`tokens.css` → `typography.css` → `base.css` → `components.css`).
2. Open `docs/design-system/index.html` to see the live component gallery, and
   `docs/template/prototype.html` for the app built in this language.
3. Confirm current Next.js global-CSS conventions in `node_modules/next/dist/docs/`
   before wiring stylesheets (this Next.js has breaking changes — see `AGENTS.md`).

## Load order (matters)

`tokens.css` must be first — everything reads its variables:

```
tokens.css → typography.css → base.css → components.css
```

Import once in the root layout (or `@import` from one global stylesheet in this order).

## Non-negotiable rules

1. **Reuse `.pk-` components** before writing any new CSS. Extend via new tokens/classes — never fork values inline.
2. **Reference tokens** (`var(--pk-*)`). Never hardcode a color, size, radius, or shadow a token already covers.
3. **Two-font split:** Unbounded (`--pk-font-display`) for headings + large numerals ONLY; Manrope (`--pk-font-text`) for everything else.
4. **Traffic-light stays fixed:** green = safe, amber = realistic, red = reach/dream — for chance only. Blue (`--pk-action`) means interactive action/links, never risk. Never add a fourth chance color.
5. **Interactive state:** keep ARIA and visuals in sync — `aria-pressed="true"` on chips, `--active`/`--on` modifiers on components.
6. **Accessibility:** pair icon-only controls with `.pk-sr-only` labels; preserve focus styles.

## Traffic-light chance code (product-critical)

| Category | Meaning | Token family | Modifier |
|---|---|---|---|
| **Safe** | ≥ 75% | `--pk-safe*` (green) | `--safe` |
| **Realistic** | 40–74% | `--pk-real*` (amber) | `--real` |
| **Reach / Dream** | < 40% | `--pk-dream*` (red) | `--dream` |

Each family has base / `-text` / `-bg` / `-lite` variants.

## Tokens quick reference (see `tokens.css`)

- **Brand/neutral:** `--pk-navy-900…700`, `--pk-ink`, `--pk-slate-600…300`
- **Surfaces:** `--pk-bg-app`, `--pk-bg-screen`, `--pk-surface`, `--pk-border(-2)`, `--pk-divider(-2)`
- **Accents:** `--pk-action` (+`-bg`), `--pk-mint` (positive on dark), `--pk-warn-*`
- **Type:** `--pk-font-display/text`, `--pk-text-*`, `--pk-lh-*`, `--pk-ls-*`
- **Space:** `--pk-space-1…8` (4px step)
- **Shape:** `--pk-radius-card`(18) `/lg`(24) `/input`(13) `/pill`(100) `/sm`(9)
- **Shadow:** `--pk-shadow-card/modal/pop` · **Gradient:** `--pk-grad-navy` · **Motion:** `--pk-ease`, `--pk-dur`

## Typography classes

`.pk-h1` `.pk-h2` `.pk-h3` (headings) · `.pk-numeral` (large metric) · `.pk-body`
`.pk-text-sm` (text) · `.pk-label` (uppercase over-line).
Foreground utilities: `.pk-fg-navy/slate/muted/safe/real/dream/action`.

## Component classes (see `components.css`)

| Class | Use |
|---|---|
| `.pk-btn--primary` / `--dark` / `--secondary` (+ `--sm`) | Buttons |
| `.pk-icon-btn` (+ `--active-star` / `--active-compare`) | Square icon button |
| `.pk-card` (+ `--hover`, `.pk-card__footer`) | Surface card |
| `.pk-pill--safe/real/dream` (+ `.pk-pill__dot`) | Chance-category pill |
| `.pk-status--saved/submitted/review/recommend/enrolled` | Application status badge (5 stages) |
| `.pk-ring--safe/real/dream` (+ `--lg`, `.pk-ring__val`) | Chance ring; % via `--pk-pct` |
| `.pk-chip` / `.pk-tab` / `.pk-segment` | Toggle chip, filter tab, segmented control |
| `.pk-toggle-row` (+ `--on`) | Benefit toggle row |
| `.pk-range` / `.pk-input` | Score slider, text field |
| `.pk-gradient-panel` (+ `.pk-metric`, `.pk-metric-label`, `.pk-metric-accent`) | Profile/metric on navy |
| `.pk-table` (+ `.pk-cell-label`) | Comparison table |
| `.pk-banner` / `.pk-empty` / `.pk-bars` | Deadline banner, empty state, bar chart |
| `.pk-modal` (+ `-overlay`, `__close`) | Detail modal |

Utilities: `.pk-sr-only` (screen-reader-only), `.pk-scroll` (hidden scrollbar).

### Chance ring — percentage via custom property

```html
<div class="pk-ring pk-ring--real" style="--pk-pct:54%">
  <span class="pk-ring__val">54%</span>
</div>
```

### Chance pill

```html
<span class="pk-pill pk-pill--safe"><span class="pk-pill__dot"></span>Safe</span>
```

## Self-check before finishing UI

- [ ] No hardcoded hex/px/radius/shadow that a `--pk-*` token covers
- [ ] Reused existing `.pk-*` classes instead of new CSS
- [ ] Unbounded only on headings/numerals; Manrope everywhere else
- [ ] Chance uses green/amber/red; blue only for actions
- [ ] `aria-pressed`/`--active`/`--on` match the visual state
- [ ] Icon-only controls have `.pk-sr-only` labels and visible focus
