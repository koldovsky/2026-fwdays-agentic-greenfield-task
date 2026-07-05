# Notely — Design System

A complete, cross-platform design system for **Notely**, a modern note-taking app for Web, Tablet, and Mobile. Notely should feel **clean, minimal, calm, productive, modern, fast, and elegant** — content-first, never decorative.

> **Sources:** Built from scratch against the product brief (no codebase or Figma was attached). Visual inspiration: Notion, Apple Notes, Craft, Linear, Todoist, Arc. If you have real brand assets or a codebase, attach them and I'll reconcile.

---

## Product overview

Notely lets people create, edit, delete, archive, and pin notes; organize with folders and tags; search, filter, sort, and favorite; share notes; view recents; sync across devices; and switch light/dark themes.

## Brand & design principles

**Brand personality** — Notion-like: neutral, restrained, content-first. The UI recedes so the user's writing is the hero. Quietly confident, never flashy.

**Design philosophy**
- *Content over chrome.* Generous whitespace, minimal borders, one accent.
- *Calm by default.* Muted neutrals; color is reserved for meaning and action.
- *Fast feels good.* Short, snappy motion (140–200ms); no gratuitous animation.
- *Consistency through tokens.* Everything references semantic CSS variables.

**UX principles** — Progressive disclosure (toolbars and options appear on focus/hover), forgiving actions (archive/trash over hard-delete, with undo), keyboard-first power, and predictable spatial structure (sidebar → list → editor).

**Accessibility principles** — WCAG 2.2 AA minimum. Body text ≥ 7:1 contrast, secondary ≥ 4.5:1. Visible focus rings on every interactive element. Touch targets ≥ 44×44px on mobile. Full keyboard operability. ARIA roles on composite widgets. Never rely on color alone.

**Visual language** — Cool-gray neutrals, a single indigo accent, soft low-spread shadows, 8px spacing rhythm, 8–12px default radii. No skeuomorphism, no heavy gradients, no decorative noise.

**Motion philosophy** — Motion clarifies, never entertains. Standard easing `cubic-bezier(0.2,0,0,1)`; enters fade+rise 4–8px; exits are faster than enters; modals scale 0.98→1 with a backdrop fade. Respect `prefers-reduced-motion`.

---

## Content fundamentals

How Notely writes. Copy is part of the calm.

- **Voice:** plain, warm, and brief. We sound like a thoughtful colleague, not a robot or a hype machine.
- **Person:** address the user as **you**; the product is **Notely** or **we** only when necessary. Avoid "the user."
- **Casing:** **Sentence case** everywhere — buttons, menus, titles, headings. Never Title Case UI, never ALL CAPS except the H6/overline label style (tracked, tiny).
- **Tone:** calm and encouraging. Empty states invite, they don't scold. Errors are honest and short, and say what to do next.
- **Length:** ruthless. Button = 1–2 words ("New note", "Save"). Tooltips ≤ 5 words. Empty-state body ≤ 12 words.
- **Punctuation:** no exclamation marks in product UI (reserve for the rare celebratory moment). No trailing periods on buttons, labels, or single-sentence tooltips.
- **Emoji:** not used in product chrome. Users may type them into their own notes; the UI itself stays emoji-free.
- **Numbers & dates:** relative where human ("2 min ago", "Yesterday", "Edited Mar 4"). Use real counts ("12 notes"), never "lots".

**Examples**
| Context | ✅ Notely | ❌ Off-brand |
|---|---|---|
| Primary button | New note | CREATE A NEW NOTE! |
| Empty notes list | Nothing here yet. Create your first note to get started. | You have no notes. |
| Delete confirm | Move "Roadmap" to Trash? You can restore it later. | Are you sure?? |
| Sync status | All changes saved | Synchronization complete. |
| Search empty | No notes match "budget" | 0 results found |

---

## Visual foundations

- **Color vibe:** cool, neutral grays (slight blue undertone) with a single **indigo** accent (`#4F46E5`). Teal is a rare secondary. Color carries meaning — success/warning/danger/info — and otherwise stays out of the way.
- **Type:** Inter for all UI, JetBrains Mono for code/inline-code. Tight tracking on large headings (`-0.02em`), normal on body. Content-first scale tuned for density.
- **Spacing:** 8px rhythm with 2/4/12/20 half-steps. Comfortable, not cramped; cards breathe with 16–24px padding.
- **Backgrounds:** flat. Page is `--color-bg` (near-white / near-black). No images, no full-bleed photography, no gradients or textures in chrome. The note content is the texture.
- **Cards:** white surface (`--color-card`), `--radius-lg` (12px), `1px` hairline border (`--color-border`) **and** a soft `--shadow-1`. On hover, lift to `--shadow-2` and border to `--color-border-strong`. No colored left-border accents.
- **Borders:** 1px hairlines everywhere; dividers are even lighter (`--color-divider`). Strong border only on hover/focus.
- **Shadows:** soft, low-spread, near-neutral (slightly cool). Six elevation levels; most UI sits at 0–2. Shadows imply layering, never drama.
- **Radii:** 8px default (inputs, buttons), 12px cards, 16px sheets/modals, full for pills/avatars/switches. Nothing sharp, nothing bubbly.
- **Hover:** subtle dark veil overlay (`--color-hover`, ~4.5% black) on neutral surfaces; primary buttons darken one step. Never scale on hover.
- **Press:** slightly stronger veil (`--color-pressed`); primary darkens two steps. Optional 0.98 scale on buttons only.
- **Focus:** 3px indigo ring at ~35% alpha (`--shadow-focus`), offset from the element. Always visible, never removed.
- **Transparency & blur:** overlays use a 45% scrim. Backdrop blur (`backdrop-filter: blur(8px)`) on the top app bar and command palette only — sparingly.
- **Selection:** selected rows/notes use `--color-selected` (indigo tint), not a heavy fill.
- **Motion:** fades and short rises; gentle `--ease-emphasized` overshoot only on playful moments (e.g. pin). No bounces, no spinners where a skeleton works.

---

## Iconography

- **Style:** **outline** icons, 1.5px stroke, rounded caps/joins — calm and legible. Filled variants only to indicate an *active/selected* state (e.g. a filled star = favorited, filled pin = pinned).
- **Set:** [**Lucide**](https://lucide.dev) — clean, consistent, MIT-licensed, matches the 1.5px rounded aesthetic. Loaded via CDN (`lucide@latest`) in cards and UI kits. *Substitution note: no icon assets were provided; Lucide is the recommended match — swap if you have a house set.*
- **Sizes:** `16` (inline / dense lists), `20` (default UI, buttons), `24` (nav, toolbars), `32` (empty states, feature moments). Icons inherit `currentColor` and align to text.
- **Emoji / unicode:** not used as UI icons. Folders may show a user-chosen color dot, not an emoji, in chrome.
- **Usage:** icons pair with text labels wherever space allows; icon-only buttons must have an `aria-label` and ideally a tooltip.

---

## Index / manifest

- `styles.css` — global entry (import this). Pulls all of `tokens/`.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadow.css`, `motion.css`, `fonts.css`, `base.css`.
- `guidelines/` — foundation specimen cards (Type, Colors, Spacing, Brand, Elevation, Motion).
- `components/` — reusable React primitives (see below) + per-group `.card.html`.
- `ui_kits/notely-app/` — interactive Notes app recreation (`index.html` + screen JSX).
- `SKILL.md` — Agent-Skills-compatible entry for using this system elsewhere.

*Component & UI-kit lists are appended at the end once built.*

### Components (26 exports, namespace `NotelyDesignSystem_fd4cb3`)
- **core/** — Button, IconButton, Badge, Tag, Avatar, Divider, Tooltip
- **forms/** — Input, SearchField, Select, Checkbox, Radio, Switch
- **layout/** — Card, Tabs, Modal
- **feedback/** — Toast, Alert, ProgressBar, Skeleton, EmptyState, Spinner
- **notes/** — NoteCard, FolderItem, ChecklistItem, EditorToolbar

### UI kit
- **ui_kits/notely-app/** — interactive recreation: Sidebar, NotesView (list/grid + search/sort), EditorView, SettingsView, tied together in App.jsx → `index.html`.

### Coverage note
This first pass delivers foundations, a broad core component set, the notes-specific building blocks, and one polished app UI kit (per the agreed scope). Components from the brief not yet built as standalone primitives — Textarea, PasswordField, Autocomplete/Dropdown menu, Drawer, BottomSheet, Breadcrumb, Pagination, DatePicker/Calendar, FAB, Accordion, Snackbar (distinct from Toast), List Item, Navigation Bar — are next. Say the word and I'll add them.
