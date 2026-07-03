# DESIGN — Prokhidnyi

The visual language for Prokhidnyi. The **source of truth is the CSS** in
`docs/design-system/`; this document explains how to read and apply it. When code
and prose disagree, the CSS wins — update this doc to match.

## What the design system is

A real, dependency-free design system: vanilla CSS custom properties + ready-made
component classes, all prefixed `--pk-` / `.pk-`. No build step, no runtime — it
drops into React, Next.js, or plain HTML by loading four stylesheets.

```
docs/design-system/
├── tokens.css        Source of truth: color, type scale, space, shape, shadows (--pk-*)
├── typography.css    Font loading (Unbounded, Manrope) + type classes (.pk-h1, .pk-body …)
├── base.css          Resets, body, form elements (slider, input)
├── components.css    Component classes (.pk-btn, .pk-card, .pk-ring, .pk-pill …)
└── index.html        Living reference gallery — open in a browser to see everything
```

Companion files: `docs/design-system/README.md` (quick start), `docs/PRD.md` &
`docs/requirements.md` (product), `docs/template/prototype.html` (the app built in
this language), `docs/template/concept.html` (the concept).

## Load order (matters)

`tokens.css` **must** come first — everything else reads its variables.

```
tokens.css → typography.css → base.css → components.css
```

In this Next.js app, import them once in the root layout (or `@import` them from a
global stylesheet in the same order). Confirm the current Next.js file/asset
conventions in `node_modules/next/dist/docs/` before wiring global CSS — see
`AGENTS.md`.

## Design tokens

Every value is a CSS variable in `:root` (see `tokens.css`). Never hardcode a hex,
size, radius, or shadow that a token already covers — reference the token so a
single theme edit propagates everywhere.

| Group | Tokens | Notes |
|---|---|---|
| Brand / neutral | `--pk-navy-900…700`, `--pk-ink`, `--pk-slate-600…300` | Text, dark buttons, gradients |
| Surfaces | `--pk-bg-app`, `--pk-bg-screen`, `--pk-surface`, `--pk-border(-2)`, `--pk-divider(-2)` | Warm off-white paper feel |
| Chance (traffic-light) | `--pk-safe*`, `--pk-real*`, `--pk-dream*` | Each has base / `-text` / `-bg` / `-lite` |
| Accents | `--pk-action` (+`-bg`), `--pk-mint`, `--pk-warn-*` | Blue = primary action/links; mint = positive on dark |
| Typography | `--pk-font-display`, `--pk-font-text`, `--pk-text-*`, `--pk-lh-*`, `--pk-ls-*` | Desktop type scale |
| Space | `--pk-space-1…8` | 4px step |
| Shape | `--pk-radius-card/lg/input/pill/sm` | 18 / 24 / 13 / 100 / 9 px |
| Shadow | `--pk-shadow-card/modal/pop` | |
| Gradient / motion | `--pk-grad-navy`, `--pk-ease`, `--pk-dur` | |

## Typography

Two families, loaded via Google Fonts in `typography.css`:

- **Unbounded** (`--pk-font-display`) — headings and large numerals/metrics only.
- **Manrope** (`--pk-font-text`) — body, labels, controls — everything else.

Type classes: `.pk-h1`, `.pk-h2`, `.pk-h3`, `.pk-numeral`, `.pk-body`,
`.pk-text-sm`, `.pk-label` (uppercase over-line). Foreground utilities:
`.pk-fg-navy/slate/muted/safe/real/dream/action`.

## The traffic-light system (product-critical)

Chance of a state-funded place is always expressed with the same three-color code —
keep it consistent across pills, rings, and text so users learn it once:

| Category | Meaning | Token family | Pill / ring modifier |
|---|---|---|---|
| **Safe** | ≥ 75% | `--pk-safe*` (green) | `--safe` |
| **Realistic** | 40–74% | `--pk-real*` (amber) | `--real` |
| **Reach / Dream** | < 40% | `--pk-dream*` (red) | `--dream` |

Never introduce a fourth chance color or reuse `--pk-action` (blue) for chance —
blue means *interactive action*, not *risk*.

## Components

Use these classes rather than rebuilding from scratch (full list in
`components.css`, live examples in `index.html`):

| Class | What it is |
|---|---|
| `.pk-btn--primary` / `--dark` / `--secondary` (+ `--sm`) | Buttons |
| `.pk-icon-btn` (+ `--active-star` / `--active-compare`) | Square icon button |
| `.pk-card` (+ `--hover`, `.pk-card__footer`) | Surface card |
| `.pk-pill--safe/real/dream` | Chance-category pill |
| `.pk-status--saved…--enrolled` | Application status badge (5 stages) |
| `.pk-ring--safe/real/dream` (+ `--lg`) | Chance ring (donut); % via `--pk-pct` |
| `.pk-chip` / `.pk-tab` / `.pk-segment` | Toggle chip, filter tab, segmented control |
| `.pk-toggle-row` (+ `--on`) | Benefit toggle row |
| `.pk-range` / `.pk-input` | Score slider, text field |
| `.pk-gradient-panel` | Profile/metric on navy gradient |
| `.pk-table` | Comparison table |
| `.pk-banner` / `.pk-empty` / `.pk-bars` | Deadline banner, empty state, bar chart |
| `.pk-modal` (+ `-overlay`, `__close`) | Detail modal |

Utilities: `.pk-sr-only` (screen-reader-only), `.pk-scroll` (hidden scrollbar).

Chance ring example — percentage is driven by the `--pk-pct` custom property:

```html
<div class="pk-ring pk-ring--real" style="--pk-pct:54%">
  <span class="pk-ring__val">54%</span>
</div>
```

## Rules when building UI

1. **Reuse `.pk-` components** before writing new CSS; extend via new tokens/classes, don't fork values inline.
2. **Reference tokens**, never hardcode a color/size/radius/shadow a token covers.
3. **Respect the two-font split** — Unbounded for display/numerals, Manrope for the rest.
4. **Keep the traffic-light semantics** — green/amber/red = chance; blue = action.
5. **Interactive state** uses `aria-pressed="true"` (chips) and the `--active`/`--on` modifiers — keep ARIA and the visual state in sync.
6. **Accessibility** — pair icon-only controls with `.pk-sr-only` labels; preserve focus styles.
7. **Fonts** load from Google Fonts by default; for offline/self-hosting, swap the `@import` in `typography.css` for local `@font-face`.
