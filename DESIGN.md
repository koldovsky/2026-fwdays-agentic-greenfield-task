# GitHub Battle — Design System

The visual system behind **GitHub Battle**: calm, warm-neutral, serif-led,
purposeful motion. This document is the contract between the design kit and the
app — read it before building any UI.

- **Full reference kit:** [`design-system/`](./design-system/) — foundations,
  component sources, UI-kit recreations, screenshots, and the original
  [`readme.md`](./design-system/readme.md). Treat that folder as the canonical
  spec; don't hand-invent values.
- **Wired runtime tokens:** [`app/tokens/`](./app/tokens/) +
  [`app/globals.css`](./app/globals.css) — what the running Next.js app actually
  uses. Keep these in sync with `design-system/tokens/`.
- **Stack:** Next.js 16 (App Router) · Tailwind 4 · React 19. The kit was authored
  against shadcn/ui "new-york", but no component library is installed yet.

---

## How it's wired

```
app/layout.tsx        → loads Newsreader + Geist + Geist Mono via next/font
                         (self-hosted), sets <html class="dark …"> with the font vars
app/tokens/*.css       → :root / .dark custom properties (colors, type, spacing, effects)
app/globals.css        → @import tailwindcss + the tokens, then @theme inline maps
                         the semantic tokens onto Tailwind utilities
design-system/         → the untouched reference kit (source of truth for values)
```

**Fonts** are loaded with `next/font/google` (self-hosted, no runtime Google
request). The design kit's `tokens/fonts.css` uses a Google `@import` instead — do
**not** use that file in the app; the next/font variables replace it. The token
family aliases resolve to those variables:

| Alias         | next/font variable   | Family                    |
| ------------- | -------------------- | ------------------------- |
| `--font-serif`| `--font-newsreader`  | Newsreader (display, numbers, italic) |
| `--font-sans` | `--font-geist-sans`  | Geist (UI + body)         |
| `--font-mono` | `--font-geist-mono`  | Geist Mono (incidental numerics) |

**Dark mode** is class-based (`.dark`), configured via
`@custom-variant dark (&:where(.dark, .dark *))`. The product **defaults to dark**
(the `dark` class is set on `<html>` in `layout.tsx`). Because every component
color is a semantic alias, flipping that one class re-themes everything, and
`dark:` utilities work as usual.

---

## Design tokens

### Colors

Warm neutrals (stone) as the whole ground — **never pure grey, never pure black**.
Two earthy brand accents: **terracotta** (primary) and **sage** (secondary). In a
battle, terracotta = side A, sage = side B. Danger is a muted brick red. Accents
shift one step lighter in dark mode so contrast holds (WCAG AA in both themes).

Always style through the **semantic aliases**, never the raw stone/terracotta
scales:

| Token                      | Tailwind utility            | Role                         |
| -------------------------- | --------------------------- | ---------------------------- |
| `--bg`                     | `bg-bg`                     | page background              |
| `--surface`                | `bg-surface`                | cards, top bar               |
| `--surface-track`          | `bg-surface-track`          | chart tracks, inset wells    |
| `--border`                 | `border-border`             | 1px hairlines                |
| `--text`                   | `text-text`                 | primary text                 |
| `--text-muted`             | `text-text-muted`           | labels, secondary text       |
| `--accent-primary`         | `*-accent-primary`          | terracotta / side A          |
| `--accent-secondary`       | `*-accent-secondary`        | sage / side B                |
| `--accent-danger`          | `*-accent-danger`           | errors, losing delta         |
| `--accent-primary-wash`    | `bg-accent-primary-wash`    | faint terracotta fill        |
| `--accent-secondary-wash`  | `bg-accent-secondary-wash`  | faint sage fill              |

### Typography

Newsreader (serif) for **all display, headings, and big numbers** — frequently
*italic* for standfirsts and the "vs". Geist (sans) for UI, labels, and body.
Geist Mono only for incidental inline numerics. **Weights stay light: 400–500 do
almost all the work; 600 marks a battle winner.**

Sizes (`--text-*`): `display` clamp(38–60px) · `h1` 30 · `h2` 20 · `stat` 32
(the big serif metric numbers) · `body` 15 · `small` 13 · `caption` 12.
Utilities: `font-serif` / `font-sans` / `font-mono`, and the size tokens are
available as `text-display`, `text-stat`, `text-caption`, etc.

Numbers are compacted and set in the serif — `5.6k`, `2.4M`, `5y` — the numbers
are the hero, so they get the display face.

### Spacing, radii, layout

4px scale (`--space-1…16`), which matches Tailwind's default numeric spacing —
use `p-4`, `gap-2`, etc. directly. Radii: `rounded-sm` 6 · `rounded-md` 10 ·
`rounded-lg` 14 · `rounded-xl` 16 · `rounded-pill` 999. Cards use radius **14–16px**.
Content column: `max-w-content` (1040px), centered.

### Effects & motion

Shadows: `shadow-sm` (subtle) · `shadow-md` (soft card lift). No heavy drop
shadows, no colored left-border accents.

Motion is **purposeful and calm**: everything eases out (`--ease-out`, also
`ease-ds`), nothing bounces hard, never continuous. Content **fades up** on load
(`.ds-fade-up`, .35–.5s); the countdown number **pops** (`.ds-pop`). Keyframes
`ds-fade-up`, `ds-pop`, `ds-bar`, `ds-win-pulse`, `ds-confetti-fall`, `ds-shimmer`
ship in `app/tokens/effects.css`. **Everything collapses to instant under
`prefers-reduced-motion`** (handled globally in `globals.css`).

The signature moment — the **battle reveal**: rows reveal one at a time on a
~240ms stagger; the score counts up as rows land; each winning value pulses once;
when all fifteen are in, the WinnerBanner pops and a Confetti burst falls (~3s,
then unmounts). Under reduced-motion the whole sequence collapses to the final
state and confetti never mounts. Reference:
`design-system/ui_kits/github-battle/index.html`.

---

## Components

The kit is a **product** design system, deliberately scoped to what GitHub Battle
uses — no generic Dialog/Tabs/Toast. Sources live in
[`design-system/components/`](./design-system/components/) (`.jsx` +
`.prompt.md` + `.d.ts` per component):

- **forms/** — `Button` (primary/accent/secondary/ghost), `UsernameInput`, `ModeToggle`
- **data/** — `MetricCard`, `LanguageDonut`, `ActivityChart`, `ReachBar`, `RepoSplit`
- **battle/** — `ScoreHeader`, `BattleRow`, `WinnerBanner`, `Confetti`, `CountdownIntro`
- **feedback/** — `Skeleton`, `StatsSkeleton`, `RateLimitCard`, `NotFoundCard`

These are token-driven `React.createElement` references (inline `var(--…)`
styles). When building production components, **lift the token values and
patterns** into Tailwind-utility JSX rather than copying the reference verbatim.
Charts are built from CSS (conic-gradient donut, flex bar columns), not a chart
library.

---

## Voice & content

- **Voice:** calm, literate, a little wry — sells restraint, not hype. Taglines
  read like a magazine standfirst.
- **Person:** address the reader as **you**, never "we". No "unlock your potential".
- **Casing:** sentence case for prose and buttons (*Explore*, *Run again*).
  ALL-CAPS only for tiny wide-tracked meta labels (*HEAD TO HEAD*). Metric labels
  are sentence case (*Total stars*).
- **Honesty under failure:** errors are plain and specific — *"User not found"*,
  *"GitHub rate limit reached — try again later."* A tie is *"a draw"*.
- **Emoji & icons:** essentially none. The product is **near-iconless by design** —
  no icon font, no SVG icon set. The only marks are the **⚔ logo glyph** (unicode,
  in a terracotta→sage gradient square) and 🌙/☀️ on the theme toggle. Do not
  sprinkle emoji into copy or cards. If a surface ever needs UI icons, add a
  thin-stroke CDN set (e.g. Lucide) and document it here — never hand-draw SVGs.

---

## Rules of thumb

1. Style through **semantic tokens / utilities**, never raw palette values or hex.
2. **Serif for numbers and headings**, sans for everything else; keep weights light.
3. New color/type/spacing values go in `app/tokens/` **and** `design-system/tokens/`
   so the two stay in sync — don't fork them silently.
4. Respect `prefers-reduced-motion`; keep motion calm and non-continuous.
5. Stay near-iconless and emoji-free. Sentence case. Address the reader as *you*.
