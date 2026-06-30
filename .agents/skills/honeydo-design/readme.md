# Honeydo — Design System

> A warm, cozy iOS personal time tracker. "Honeydo" puns on a *honey-do list*:
> playful but still about getting things done. The whole system runs on a honey
> theme — golden, tactile, calm but productive — with a subtle honeycomb/hexagon
> motif through cards, progress, and the streak.

This project **is** the design system (no external codebase or Figma was provided —
it was authored from the product brief). Everything here is generative-but-systematic:
every color is a named token so Light/Dark is a swap, type and spacing follow a fixed
scale, and the screens are built from the same component primitives a consuming
project would use.

**Sources:** product brief only (Honeydo iOS spec). No GitHub repo, Figma file, or
prior codebase. Visual DNA borrowed conceptually from Toggl Track (start/stop + entry
rows), Timery (widgets/quick-start), Hours (day timeline), Structured (cozy iOS
spacing), Forest (filling-progress metaphor), Headspace (warm orange done right),
Streaks (minimal streak UI), and Duolingo/Finch (celebration warmth, dialed down).

---

## CONTENT FUNDAMENTALS — how Honeydo writes

**Voice:** warm, encouraging, a little playful — never corporate, never cluttered.
Talks to the user as a friendly companion, not a productivity drill sergeant.

- **Person:** second person ("your hive", "you're 1h ahead", "keep it warm"). The
  app refers to itself as Honeydo, never "we".
- **Casing:** sentence case everywhere — buttons, titles, rows. Section labels
  (TODAY, QUICK START, APPEARANCE) are the one exception: short ALL-CAPS eyebrows
  with light letter-spacing.
- **Tone examples:**
  - Empty state: *"Your hive is empty"* / *"Start a timer with a quick note about
    what you're doing. Stop it when you switch. That's the whole thing."*
  - Insight: *"You're 1h ahead of your usual Tuesday pace — nice and steady."*
  - Streak: *"Hit your goal 5 days running — keep it warm."*
  - Auth: *"Track your day, one sweet entry at a time."*
- **Honey vocabulary, used sparingly:** hive, sweet, warm, pour, keep it warm. A
  little goes a long way — one honey metaphor per screen, max. Never twee.
- **Numbers are friendly:** "6h 12m", "5-day streak", "1:24:08". Durations are
  human ("32m", "2:15:00"), not "0h 32m 00s".
- **Emoji:** essentially none in UI chrome. The only sanctioned glyph is the bee 🐝
  (streak celebration / empty avatar) and a flame for the streak count — used as
  small accents, never in body copy.
- **Brevity:** one primary action per screen, one sentence per helper line. If a
  sentence can lose words and keep its meaning, cut them.

---

## VISUAL FOUNDATIONS

**Color.** A single bold accent — **honey amber** — on warm neutrals. Two themes from
one token set:
- *Light:* amber `#F5A300` on cream `#FFFBF2` / white surfaces. Warm cream
  `surface-alt` `#FFF4DE` for grouped fields.
- *Dark (default):* slightly brighter amber `#FFB23E` on **warm dark gray**
  `#1C1A17` — never pure black. Surfaces step up `#262220` → `#2A2520`.
- Text is warm-tinted, not neutral gray (`#2A2118` light / `#F4ECDD` dark). Muted
  text is a warm taupe.
- Semantic stays warm: success/goal-met is a **honeyed green** (`#3E8E4F` light /
  `#7BC57F` dark). The running-timer state **glows amber** rather than turning a
  different hue.
- On-accent text is a deep warm brown (`#2A1B05`) in both themes for AA contrast on
  amber. Always use the semantic aliases (`--accent`, `--text`, `--surface`…), never
  the raw `--honey-l-*` / `--honey-d-*` palette.

**Type.** SF Pro Rounded for headings and all numeric readouts (friendly, honey-soft),
SF Pro Text for body. Big tabular numerals for elapsed time (56px) and totals (40px).
iOS-leaning scale: large title 34/800, title 28, headline/body 17, subhead 15,
footnote 13, caption 12. *(SF Pro is Apple-proprietary — see Fonts note below.)*

**Spacing & layout.** 4pt base; 20px default screen gutter. Native iOS structure:
large titles, grouped cards, a blurred bottom tab bar, generous breathing room, one
primary action per screen. Logical width caps ~430px.

**Corner radii.** Soft and tactile — 12 (small), 16 (default card), 22 (sheet/large
card), full pills for buttons and chips, and the iOS continuous-corner squircle for
the app icon. Nothing sharp.

**Cards.** Surface fill + 1px warm border + soft warm-tinted shadow (never harsh
black — shadows are `rgba(42,27,5,…)`). The running-timer card swaps its border to
amber and adds a glow ring (`--shadow-glow`).

**Backgrounds.** Mostly flat warm surfaces. Heroes and empty states get the faint
**honeycomb texture** (`.honey-comb-bg`) plus a soft amber radial from the top. No
heavy gradients elsewhere — gradient is reserved for the amber app-icon/avatar/jar
marks (gold→amber).

**Elevation & transparency.** Three soft shadow steps plus the amber glow. The tab
bar uses translucent surface + backdrop blur (iOS material). Translucent fills
(`--fill-soft`, `--accent-faint`) for chips and overlays.

**Motion.** Calm and satisfying — *no harsh bounces*. Standard `cubic-bezier(.4,0,.2,1)`
for most; a gentle `--ease-settle` for press/settle; a *restrained* `--ease-spring`
only where a tiny pop helps. Durations 140/240/420ms, plus a 700ms "honey pour".
- Press states: soft scale-down (0.92–0.96), never color-only.
- Hover (where relevant): subtle fill lighten.
- Running timer: gentle amber glow pulse (2.6s).
- Bars/streak: staggered settle up from baseline.
- **Always** gated behind `@media (prefers-reduced-motion)` — the base/end state is
  the visible one, animations only enhance.

**Borders.** 1px warm hairlines (`--border`); 0.5px iOS separators inside grouped
lists.

---

## ICONOGRAPHY

- **Icon set:** [Lucide](https://lucide.dev) loaded from CDN (`unpkg.com/lucide`).
  Lucide's rounded 2px-stroke style matches the friendly, honey-soft tone and reads
  as native-iOS-adjacent. Used in cards and the UI kit via
  `<i data-lucide="timer"></i>` + `lucide.createIcons()`.
  - **Substitution flag:** Honeydo would ship Apple SF Symbols on-device; Lucide is
    the closest open, CDN-available stand-in for these mockups. Swap to SF Symbols in
    production.
- **App marks** (jar, drop, crescent, hexagon) are simple geometric SVG — one strong
  shape each, amber on a warm ground. See `guidelines/app-icons.html`.
- **Emoji:** only the bee 🐝 (streak/empty) and never in body copy. The streak count
  uses a Lucide `flame`.
- **The honeycomb hexagon** is the brand glyph — it appears in the logo mark, empty
  state, and as the streak cell shape.

---

## FONTS — substitution notice

The brand specifies **SF Pro Rounded** (headings/numbers) and **SF Pro Text** (body).
These are Apple-proprietary system fonts and can't be redistributed, so:

- On Apple devices the tokens resolve to the **real** system fonts via the `ui-rounded`
  / `-apple-system` keywords — so on a Mac/iPhone these mockups look authentic.
- Everywhere else they fall back to the closest **Google Fonts** substitutes loaded in
  `tokens/fonts.css`: **Nunito** (for SF Pro Rounded) and **Nunito Sans** (for SF Pro
  Text).

➡️ **Action for you:** if you have licensed SF Pro webfont files, drop the `.woff2`
into `tokens/` and replace the `@import` in `tokens/fonts.css` with `@font-face` rules.

---

## INDEX — what's in this project

**Global entry**
- `styles.css` — the one file consumers link (@import list only).
- `tokens/` — `colors.css` (both themes), `typography.css`, `layout.css`
  (spacing/radius/shadow/motion), `fonts.css`, `base.css` (resets + honeycomb bg).

**Foundations** (`guidelines/foundations/`, shown in the Design System tab)
- Colors: light palette, dark palette, accent/states/semantic.
- Type: rounded display, body & scale, numeric readouts.
- Spacing: scale, corner radii. Brand: honeycomb motif, elevation & glow.

**Components** (`components/`)
- `core/`: `Button`, `IconButton`, `Input`, `Tag`, `FilterChip`, `Card`, `Badge`,
  `Avatar`, `Switch`, `SegmentedControl`.
- `app/`: `TimerEntry`, `WeekChart`, `StreakHive`, `InsightCard`, `TabBar`.
- Each has `.jsx` + `.d.ts` + `.prompt.md`; `core.card.html` / `app.card.html` are the
  Design System tab specimens. Import via `window.HoneydoDesignSystem_cfe9be`.

**UI kit** (`ui_kits/honeydo/`)
- `index.html` — interactive click-through: Sign in → First run → the tabbed app
  (Timer, History, Stats, Profile), with a Light/Dark toggle. Screens are factored
  into `AuthScreen.jsx`, `EmptyScreen.jsx`, `TimerScreen.jsx`, `HistoryScreen.jsx`,
  `StatsScreen.jsx`, `ProfileScreen.jsx`, wired by `App.jsx` over `kit-shared.jsx`.

**Brand / platform specimens** (`guidelines/`)
- `app-icons.html` — 4 app-icon concepts (jar, crescent, jar=moon, honey drop).
- `widgets.html` — Home Screen widgets (small + medium).
- `dynamic-island.html` — Dynamic Island (compact/minimal/expanded) + Lock Screen
  Live Activity.

**Skill** — `SKILL.md` makes this folder usable as a downloadable Agent Skill.
