# GitHub Battle Design System

The visual system behind **GitHub Battle** — a keyless web app that turns public
GitHub activity into an interactive experience: explore one developer's aggregate
stat sheet, or battle two developers head-to-head across fifteen live metrics.

This system codifies the **Editorial** direction: calm, warm-neutral, serif-led,
purposeful motion. It is built to drop straight into the product's stack
(Next.js 16 App Router · Tailwind 4 · shadcn/ui "new-york").

## Sources

- Product brief & PRD: `docs/product-brief.md`, `docs/requirements.md` in the
  `2026-fwdays-agentic-greenfield-task` codebase (fwdays Academy · Agentic
  Engineering: Greenfield).
- The working prototype these tokens were extracted from: `GitHub Battle.dc.html`
  (root of this project) — the interactive three-screen app with live GitHub data.

## Index / manifest

- `styles.css` — global entry point (import this one file). `@import`s only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/`
  - `forms/` — **Button**, **UsernameInput**, **ModeToggle**
  - `data/` — **MetricCard**, **LanguageDonut**, **ActivityChart**, **ReachBar**, **RepoSplit**
  - `battle/` — **ScoreHeader**, **BattleRow**, **WinnerBanner**, **Confetti**, **CountdownIntro**
  - `feedback/` — **Skeleton**, **StatsSkeleton**, **RateLimitCard**, **NotFoundCard**
- `ui_kits/github-battle/` — interactive click-through recreation of all three
  screens (Landing → Stats → Battle).
- `SKILL.md` — portable skill wrapper.

Component inventory is deliberately scoped to what GitHub Battle actually uses;
this is a product design system, not a generic UI library. No Toast / Dialog /
Tabs etc. because the product has none.

---

## Content fundamentals

- **Voice:** calm, literate, a little wry. It sells restraint, not hype. Taglines
  read like a magazine standfirst — *"A quieter way to read a developer."*,
  *"The aggregate picture GitHub never shows you."*
- **Person:** addresses the reader as **you**; never "we". No marketing "unlock
  your potential" language.
- **Casing:** sentence case for prose and buttons (*Explore*, *Run again*).
  ALL-CAPS reserved for tiny meta labels with wide tracking (*HEAD TO HEAD*,
  *languages*). Metric labels are sentence case (*Total stars*, *Account age*).
- **Numbers:** compacted (`5.6k`, `2.4M`, `5y`) and set in the serif — the numbers
  are the hero, so they get the display face.
- **Honesty under failure:** errors are plain and specific — *"User not found"*,
  *"GitHub rate limit reached — try again later."* A tie is announced as *"a draw"*,
  never spun.
- **Emoji:** essentially none. The only glyph is the ⚔ mark in the logo lockup and
  the 🌙/☀️ on the theme toggle. Do not sprinkle emoji into copy or cards.

## Visual foundations

- **Palette:** warm neutrals (stone) as the whole ground — never pure grey, never
  pure black. Two earthy brand accents: **terracotta** (`--accent-primary`) and
  **sage** (`--accent-secondary`). In battle, terracotta = side A, sage = side B.
  Danger is a muted brick red. Accents shift one step lighter in dark mode so
  contrast holds (WCAG AA both themes).
- **Themes:** light is `:root`; dark is `.dark`. Every color used in a component is
  a **semantic alias** (`--bg`, `--surface`, `--text`, `--accent-primary`), so a
  single class flip re-themes everything. The product defaults to dark.
- **Type:** **Newsreader** (serif) for all display, headings, and big numbers —
  frequently *italic* for standfirsts and the "vs". **Geist** (sans) for UI,
  labels, and body. Geist Mono only for incidental inline numerics. Weights stay
  light: 400–500 do almost all the work; 600 marks a battle winner.
- **Cards & surfaces:** `--surface` fill, **1px `--border`**, radius **14–16px**,
  optional soft `--shadow-md`. The stats board is a 1px-gap grid so cards read as
  one ledger. No colored left-border accents, no heavy drop shadows.
- **Charts:** built from CSS, not a chart lib — conic-gradient donut, flex bar
  columns, magnitude bars, a stacked split bar. All use the accent + track tokens.
- **Motion:** purposeful and calm. Content **fades up** on load (`ds-fade-up`,
  .35–.5s, `--ease-out`); the countdown number **pops** (`ds-pop`). Never a hard
  bounce, never continuous motion. Everything collapses to instant under
  `prefers-reduced-motion`.
- **The battle reveal sequence** (the product's signature moment): rows reveal one
  at a time on a ~240ms stagger (`rowReveal`); the score **counts up** as each row
  lands (recomputed from revealed rows, not tweened); each winning value **pulses**
  once (`ds-win-pulse`); when all fifteen are in, the **WinnerBanner** pops in
  (`ds-pop`) and a **Confetti** burst falls (`ds-confetti-fall`, ~3s, then
  unmounts). Under reduced-motion the whole sequence collapses to the final state
  instantly and confetti never mounts. Reference implementation:
  `ui_kits/github-battle/index.html`.
- **Hover/press:** hover lifts opacity or shifts the accent; there is no scale-on-
  hover. Focus rings are the browser default suppressed in favor of the 1.5px
  colored input border.
- **Layout:** centered column, `--maxw-content` 1040px. Generous vertical rhythm.
  Sticky, quiet top bar on `--surface`.

## Iconography

The product is near-iconless by design — meaning comes from type and number, not
glyphs. There is **no icon font and no SVG icon set**. The few marks in use:

- The **⚔ logo glyph** — a unicode crossed-swords character in a gradient rounded
  square (terracotta→sage). This is the brand's only mark; there is no separate
  logotype file. Render it as text, as the lockup does.
- **🌙 / ☀️** on the theme toggle (functional, not decorative).
- Language legend **color dots** stand in for language icons, colored by GitHub's
  own language palette.

If a future surface needs UI icons, add a thin-stroke CDN set (e.g. Lucide) and
document it here — do not hand-draw SVGs.

## Caveats & substitutions

- **Fonts are loaded from Google Fonts** (`tokens/fonts.css`), not self-hosted.
  Newsreader and Geist are both the real families the product uses — no
  substitution — but for offline/production use you'll want to self-host the
  binaries and swap the `@import` for `@font-face` rules.
- **No logo file was provided**, and the product has no bespoke logotype: the mark
  is the ⚔ glyph + "GitHub Battle" set in Geist. Nothing was drawn or invented. If
  you have a real mark, drop it in `assets/` and update the lockup.
