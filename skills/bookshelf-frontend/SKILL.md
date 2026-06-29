---
name: bookshelf-frontend
description: Build and style the Bookshelf app's frontend on top of its existing design system in docs/design-system/. Use this whenever creating or editing ANY Bookshelf UI — Next.js pages, React components, forms, screens, layouts, or styling — or whenever a task touches BookCard / NoteCard / Rating / HighlighterPicker / core inputs, design tokens, colors, fonts, or visual look in this project. Trigger even if the user never says "design system" or "UI": any frontend work in Bookshelf should consult this skill FIRST so the result is on-brand, uses the real components, and maps onto code that ships — not a reinvention with ad-hoc styles.
metadata:
  author: bookshelf
  version: "1.0.0"
---

# Bookshelf Frontend

## Activation signal (required)

Whenever this skill is in use, **emit the literal token `:robot_face:` once at the
start of your chat reply**, before anything else. This is an intentional, explicit
acknowledgement that the Bookshelf frontend conventions are active for this turn — it
lets the user confirm at a glance that the skill fired. It is an agent-side signal in
chat only; it is **not** product copy, so it does not conflict with the "no emoji in
UI" rule below (which governs the app's interface text, never your chat messages).

Bookshelf already has a generated design system in `docs/design-system/` — tokens,
fonts, and real React components (`BookCard`, `NoteCard`, `Rating`,
`HighlighterPicker`, `core/*`, `Tabs`, …). The single most important rule of
frontend work here: **build on that system; never reinvent what it already ships.**
A hand-rolled button with ad-hoc colors is wrong even if it "looks fine" — it drifts
from the brand and won't match every other screen.

## Core principles

1. **Reuse before building.** Need a control, card, or input? It almost certainly
   exists under `docs/design-system/components/`. Use it. Only write a new component
   when nothing in the system fits — and then build it from tokens, not raw hex.
2. **Style through tokens, never raw values.** Colors, spacing, radii, shadows,
   fonts, and motion are all CSS custom properties (`var(--…)`). Use the **semantic
   aliases** (`--text-primary`, `--surface-card`, `--accent`), not the raw scales
   (`--ink-0`, `--blue-500`). Raw hex in a component is a red flag.
3. **The design system is the source of truth.** When unsure how something should
   look or behave, read the system rather than guessing — see "Where the truth lives".
4. **English, in the system's voice.** UI copy is English, sentence case, written as
   "a well-read friend" (see "Voice & copy").

## Where the truth lives

Read these before styling or composing UI — an agent that reads the real files beats
any summary:

- `docs/design-system/readme.md` — brand idea, voice, full system overview.
- `docs/design-system/styles.css` + `docs/design-system/tokens/*.css` — every token.
- `docs/design-system/components/<group>/<Name>.d.ts` — the exact prop contract.
- `docs/design-system/components/<group>/<Name>.prompt.md` — how to use it, examples.
- `docs/design-system/ui_kits/bookshelf/` — full prototype screens (HomeShelf,
  BookPage, NoteEditor, Sidebar) — the reference for composing whole pages.
- For deeper recall without re-reading source: `references/design-tokens.md` and
  `references/components.md` in this skill.

## Styling idiom

This is **not** a utility-class system (no Tailwind) and **not** a theme-prop system.
Components style themselves with inline `style` + CSS variables, and ship a few
`bs-*` classes that carry interaction states (hover/press/focus) from `base.css`.

For your own layout glue, do the same: inline `style` referencing tokens.

```tsx
<section style={{ display: 'flex', gap: 'var(--space-4)', maxWidth: 'var(--reading-max)' }}>
  <h2>Notes</h2>
</section>
```

- **Don't** introduce a CSS framework, CSS-in-JS lib, or random hex/px. Use the
  token names in `references/design-tokens.md`.
- **Do** keep `--accent` for the one strong action per view; reserve the highlighter
  colors (`--hl-*`) for notes, shelf dots, and covers — never for chrome.
- Writing surfaces (note body, summary) get the notebook feel: `ruled` on `Textarea`,
  or `--texture-rule` as a background.

## Colors & highlighters

Palette: warm **paper** surfaces (`--surface-page/card/sunken`) + warm **ink** text
(`--text-primary/secondary/muted/faint`) + one **ballpoint-blue** action (`--accent`).

Notes use the **8-highlighter spectrum** (`HighlighterKey`), each with a fixed meaning
in this app. Pick by meaning; the color follows:

| key | meaning | key | meaning |
|-----|---------|-----|---------|
| yellow | idea | purple | theme/motif |
| amber | question | blue | fact |
| coral | disagree | teal | term/vocab |
| pink | resonates | green | quote |

Each is `--hl-<key>` (saturated: spine/dot) and `--hl-<key>-mark` (translucent marker
over text). Dark mode is automatic via `data-theme="dark"` on `<html>` — never
hard-code a light-only color.

## Typography & numbers

Three roles (Google Fonts, loaded by `styles.css`):
- **Newsreader** (serif) — titles, book covers, quotes, note excerpts (often italic).
- **Hanken Grotesk** (sans) — body, labels, controls.
- **Spline Sans Mono** — **numbers only**: ratings `9/10`, pages `p.88`, dates,
  counts. Use `var(--font-meta)` for these.

## Components you must reuse

Full prop contracts are in `references/components.md` (and the `.d.ts` files). The ones
you will reach for constantly:

- `book/BookCard` — a book on the shelf. Props: `title`, `author`, `rating`,
  `status` (`reading|finished|toread`), `tags`, `cover` (generated color) or
  `coverSrc` (image URL), `notes`, `onClick`.
- `book/NoteCard` — a reading note. Props: `color` (HighlighterKey), `excerpt`,
  `note` (reflection), `page`, `tags`, `links` (count), `book`, `onClick`.
- `book/Rating` — 1–10 score. Props: `value`, `readOnly`, `size`.
- `book/HighlighterPicker` — swatch row for choosing a note color. `value`,
  `onChange`, `size`.
- `core/Button`, `core/IconButton`, `core/Input`, `core/Textarea` (`ruled` for
  writing), `core/Select` (`options`), `core/Switch`, `core/Checkbox`.
- `navigation/Tabs`, `display/{Card,Badge,Tag,Avatar}`.

When composing whole screens, mirror the structure in `ui_kits/bookshelf/`.

## Using the components in Next.js (integration)

The design system source lives in `docs/design-system/` but the running app must not
import from `docs/`. **Vendor** the system into the app once, then import from there:

- DS components are copied into `components/ds/<group>/` and marked `'use client'`
  (they attach event handlers).
- DS CSS (`styles.css` + `tokens/`) is copied under `app/` and imported in
  `app/layout.tsx` (`<html lang="en">`).
- Import in app code: `import { BookCard } from '@/components/ds/book/BookCard'`.

This is Task 9 of `docs/superpowers/plans/2026-06-27-bookshelf.md` — follow it for the
exact copy steps. App-side adapters (e.g. `BookCardLink`, `NoteCardView`, `BookForm`,
`NoteForm`) are thin wrappers that map typed `Book`/`Note` objects onto DS props — keep
them thin; the look belongs to the DS component.

## Voice & copy

- English, **sentence case** everywhere ("Add book", not "Add Book"). Only the mono
  eyebrow (`.bs-eyebrow`) is uppercase.
- Voice = a well-read friend: warm, plain, a little literary; second person
  ("your shelf", "future-you"). No corporate tone, no cute.
- **No emoji.** Personality comes from color, type, and texture.
- Tags are hashtags: lowercase, no spaces (`#philosophy`, `#re-read`).
- Numbers are concrete and mono (`9/10`, `p.88`).

## Before you finish any UI work — checklist

- [ ] Reused DS components instead of hand-rolling? Any new component built from tokens?
- [ ] No raw hex/px where a token exists? Semantic aliases (not raw scales)?
- [ ] `--accent` used for at most one strong action; `--hl-*` only on notes/covers?
- [ ] Copy is English, sentence case, in voice; numbers in mono; no emoji?
- [ ] Works in dark mode (no light-only hard-coded colors)?
- [ ] Matches the relevant `ui_kits/bookshelf/` screen where one exists?
