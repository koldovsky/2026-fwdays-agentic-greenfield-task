# Bookshelf — Design System

Bookshelf is a **local-first web app for reading notes**. The loop: read a book →
write color-coded notes → link notes to other books/notes → rate it 1–10 → write a
summary. Every book has its own page; the home screen groups books into shelves by tag.

The brand idea is a **pen and a fistful of highlighters on warm paper**: a single
ballpoint-blue action color, a full highlighter spectrum reserved for notes, a literary
serif for anything that reads like a book, and notebook textures (ruled lines, dot grid)
as the connective tissue.

> **Sources:** This is a greenfield brand — no prior codebase, Figma, or assets were
> provided. Direction was set with the user: *playful & colorful, notebook feel, serif
> display, light + dark, English UI, web app, full highlighter spectrum.* Fonts are
> served from **Google Fonts CDN** (not self-hosted) — see Caveats.

---

## Content fundamentals

**Voice — a well-read friend, not a librarian.** Warm, plain, a little literary. Short
sentences. Second person ("your shelf", "future-you"). Never corporate, never cute.

- **Casing:** Sentence case everywhere — headings, buttons, tabs, menu items. ("Add book",
  not "Add Book".) The only all-caps is the mono eyebrow/overline, used sparingly.
- **Person:** "You / your" for the reader; the app never refers to itself in the first person.
- **Tone examples:**
  - Empty notes state → *"No notes yet — highlight your first passage."*
  - Summary placeholder → *"Write your summary — what should future-you remember about this book?"*
  - Note prompt → *"What does this passage make you think?"*
  - Section labels → *"Currently reading", "The shelf", "To read".*
- **Numbers are concrete and mono:** ratings as `9/10`, pages as `p.88`, dates as `2026·03·14`.
- **Hashtags for shelves/tags:** lowercase, no spaces — `#philosophy`, `#re-read`, `#favorites`.
- **No emoji.** Personality comes from color, type, and texture — not emoji.
- **Punchy, not clever.** Avoid exclamation marks except in genuine celebration; avoid jargon.

---

## Visual foundations

**Palette.** A warm **paper** neutral ramp (cream `--paper-1` page, white cards) against a
warm near-black **ink** ramp for text. One brand color: **ballpoint ink-blue**
(`--accent`, `--blue-500` `#3a4fe0`) — the single strong action per view. The **highlighter
spectrum** (8 colors: yellow, amber, coral, pink, purple, blue, teal, green) is reserved
almost exclusively for notes, shelf dots, and generated book covers — never for chrome.
Each highlighter has a saturated `--hl-*` (dots, spines) and a translucent `--hl-*-mark`
(the marker stroke painted over text). Semantic green/amber/red appear only for status.

**Typography.** Display = **Newsreader** (literary serif) for titles, book covers, quotes,
and note excerpts — often *italic* for excerpts. UI = **Hanken Grotesk** (friendly humanist
sans) for body, labels, controls. Meta = **Spline Sans Mono** for numbers only (ratings,
pages, dates, counts). Tight tracking on display (`-0.02em`); reading body at 17px/1.6.

**Backgrounds & texture.** Flat warm paper — **no photographic backgrounds, no gradients in
chrome.** Gradients appear *only* on generated book covers (a tasteful 160° two-stop of one
highlighter family). The signature texture is **notebook ruled lines** (`--texture-rule`,
32px rhythm) on writing surfaces (summary, note body) and an optional **dot grid**
(`--texture-dot`). Use texture to signal "this is for writing."

**Corners & cards.** Generous, friendly rounding — controls `8–12px`, cards `16px`, modals
`22px`, pills full. Cards are **white paper on cream** with a 1px warm hairline
(`--border-default`) and a low, warm drop shadow (`--shadow-sm`). Notes and some cards carry
a **4px left color spine** in their highlighter color. No colored-left-border-only cards as
decoration — the spine always encodes the note's actual color.

**Shadows.** Warm-tinted, low, paper-like (`--shadow-xs → xl`); never cool grey, never
neon glow. Dark mode deepens them with black alpha.

**Elevation & blur.** Transparency/blur is used in exactly one place: the note-editor modal
scrim (`#17130c66` + `blur(3px)`). Everything else is opaque paper.

**Motion.** Quick and gently springy — `--dur-fast 120ms`, `--dur-base 180ms`. Eases:
`--ease-out` for color/opacity, `--ease-spring` for toggles and swatch selection (a small
overshoot). No long fades, no infinite decorative loops.

**Interaction states.**
- *Hover:* buttons darken slightly (`brightness .97`); ghost/quiet controls fill with
  `--surface-sunken`; cards marked `interactive` lift `-3px` with a larger shadow.
- *Press:* buttons nudge down `1px`; icon buttons scale to `.94`; swatches scale up.
- *Focus:* a 3px blue focus ring (`--focus-ring`) on keyboard focus.
- *Selected:* fills `--accent` (tags, tabs underline) or `--accent-soft` tint (nav rows).

**Layout.** Fixed left sidebar (`--sidebar-w 264px`), scrolling content. Content max
`--container-max 1180px`; reading column (book page, summary) narrows to
`--reading-max 680px` for comfortable line length. 4px spacing base.

**Dark mode.** "Reading lamp" — deep warm ink ground (`--paper-1 #1a1610`), paper ramp
inverts, highlighters stay but read against dark, blue brightens for contrast. Toggle via
`data-theme="dark"` on `<html>` (or `.dark`).

---

## Iconography

**Lucide** (https://lucide.dev) — clean, rounded, consistent **2px stroke** line icons that
match the friendly-notebook tone. Loaded from CDN; rendered via `<i data-lucide="name">` +
`lucide.createIcons()`, or passed to components (`Button`, `IconButton`) as nodes. Common
glyphs: `library`, `book-open`, `sticky-note`, `bookmark`, `highlighter`, `link`/`link-2`,
`pencil`, `search`, `plus`, `star`, `sun`/`moon`, `arrow-left`, `check`, `x`.

- **Stroke, not fill** — keep the 2px outline style; don't mix in filled icon sets.
- **No emoji as icons.** **No hand-drawn one-off SVGs** beyond the logo mark.
- **Unicode** is used only for tiny affordances: the select chevron `▾` and the tag remove `×`.
- **Substitution flag:** Lucide is a *chosen* set for this greenfield brand (no original
  icon font existed). Swap if you adopt a house set later.

**Brand assets** (`assets/`): `logo-mark.svg` (rounded-square mark — three highlighter book
spines on a shelf), `logo-wordmark.svg` (mark + "Bookshelf" in Newsreader). Mark works on
paper, ink, and brand grounds.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this). `@import` lines only.
- `readme.md` — this guide. · `SKILL.md` — Agent-Skills wrapper.

**Tokens** (`tokens/`, all reachable from `styles.css`)
- `fonts.css` (Google Fonts) · `colors.css` (paper/ink/blue/highlighters + semantic aliases,
  incl. dark) · `typography.css` · `spacing.css` · `effects.css` (radii, shadows, motion,
  textures) · `base.css` (resets + component interaction states).

**Components** — namespace `window.BookshelfDesignSystem_18192e`
- `components/core/` — `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`
- `components/navigation/` — `Tabs`
- `components/display/` — `Tag`, `Badge`, `Avatar`, `Card`
- `components/book/` — `Rating` (signature 1–10), `HighlighterPicker`, `NoteCard`, `BookCard`

**UI kit**
- `ui_kits/bookshelf/` — full click-through web app (shelf → book page → note editor). See its README.

**Foundation cards** — `guidelines/foundations/*.card.html` (Colors, Type, Spacing, Brand).

**Starting points** — Bookshelf app screen, plus `Button`, `Rating`, `NoteCard`, `BookCard`.

---

## Using the system
1. Link `styles.css` for tokens + fonts + interaction states.
2. Load `_ds_bundle.js` (auto-generated), read components from `window.BookshelfDesignSystem_18192e`.
3. Load Lucide from CDN for icons. Reach for `--accent` for the one strong action; reserve
   `--hl-*` for notes and covers; put `ruled`/`--texture-rule` on writing surfaces.
