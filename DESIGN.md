# Notely Design System

The Notely design system (from `docs/Notely Design System.zip`) is integrated into this
repo at [`.agents/skills/notely-design/`](.agents/skills/notely-design/). It's both:

- a **user-invocable agent skill** (`SKILL.md`) for generating on-brand mocks/prototypes, and
- the **live source** for tokens and components used by the app itself.

There is exactly one copy of the design system in the repo — `app/` imports directly from
the skill folder, so the app and the skill can never drift apart.

## Brand in one paragraph

Notely is calm, minimal, content-first — Notion/Craft/Linear-adjacent, never decorative.
Cool-gray neutrals, one indigo accent (`#4F46E5`), soft low-spread shadows, 8px spacing
rhythm, 8–12px radii. Copy is sentence case, warm, brief, no exclamation marks, no emoji in
chrome. Full rules: [`.agents/skills/notely-design/readme.md`](.agents/skills/notely-design/readme.md).

## Layout of the skill folder

```
.agents/skills/notely-design/
├── SKILL.md            agent-facing entry point (how/when to use this skill)
├── readme.md           full brand & UX guidelines
├── styles.css           reference global entry (tokens/fonts.css + all tokens) — use this
│                        for standalone HTML prototypes; the Next.js app imports the token
│                        files individually instead (see "Fonts" below)
├── tokens/              colors, typography, spacing, radius, shadow, motion, base
├── components/          React primitives — core/ forms/ layout/ feedback/ notes/
│   └── index.js         barrel export — import components from here, not internals
├── guidelines/          foundation specimen pages (*.card.html) — open directly in a browser
└── ui_kits/notely-app/  full interactive app recreation (Sidebar/NotesView/EditorView/
                         SettingsView) — reference for building the real dashboard
```

## Using it in the app

```tsx
import { Button, Card, NoteCard } from "@notely-design/components";
```

`@notely-design/*` is a `tsconfig.json` path alias for `.agents/skills/notely-design/*`
(see [tsconfig.json](tsconfig.json)). Every component ships as `Name.jsx` + a hand-written
`Name.d.ts` next to it, so imports are fully typed even though the components themselves
are plain JS (TypeScript resolves the `.d.ts` over the `.jsx`). Components that use state or
DOM event handlers are marked `"use client"` (see "Local adaptations" below) — safe to render
from Server Components, but they themselves are client leaves.

All components read CSS custom properties (`var(--color-primary)`, `var(--radius-md)`, etc.)
straight from `tokens/*.css` — there's no Tailwind config mapping to keep in sync. Use
Tailwind for layout/flex/grid; use the design tokens (`className="t-h1"`, inline `style` with
`var(--color-...)`, or the components themselves) for anything brand-specific.

### Fonts

The design system's `tokens/fonts.css` loads Inter + JetBrains Mono via a Google Fonts CDN
`@import` — fine for throwaway HTML, but it can't legally sit after Tailwind's rules once
bundled, and it isn't optimized. [`app/layout.tsx`](app/layout.tsx) instead self-hosts both
fonts via `next/font/google`, and [`app/globals.css`](app/globals.css) points the design
system's `--font-sans` / `--font-mono` tokens at them. If you use the skill for a static HTML
prototype outside the app, load `styles.css` as-is (CDN fonts included).

### Dark mode

Tokens fully define a dark theme (`tokens/colors.css`, `[data-theme="dark"]`), and the
`ui_kits/notely-app/App.jsx` reference shows a toggle that flips `document.documentElement`'s
`data-theme` attribute. The app doesn't wire up a theme switch yet — light theme is the
default until Settings (UI-001) is built.

## Local adaptations to the vendored skill

These are the only changes made to the zip's contents, so future re-syncs know what to
re-apply:

1. Removed `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` — internal
   tooling artifacts for the design tool's own preview/lint pipeline, not needed here.
2. Added `components/index.js` + `components/index.d.ts` — a barrel export, which the
   design system's own (removed) lint config already expected consumers to import from.
3. Added `"use client";` to the top of every component that uses hooks or DOM event
   handlers (`Button`, `IconButton`, `Tag`, `Tooltip`, `Checkbox`, `Input`, `Radio`,
   `SearchField`, `Select`, `Switch`, `Card`, `Modal`, `Tabs`, `Alert`, `Toast`,
   `ChecklistItem`, `EditorToolbar`, `FolderItem`, `NoteCard`) — required by the App
   Router's Server-Components-by-default model. Purely presentational components
   (`Avatar`, `Badge`, `Divider`, `EmptyState`, `ProgressBar`, `Skeleton`, `Spinner`) were
   left as Server Components.
4. `Tag`: when `onClick` is passed without `removable`, the chip is used as a clickable
   toggle (tag filters, tag-picker "add" chips) but was a bare `<span onClick>` — not
   reachable or activatable via keyboard at all. Added `role="button"`, `tabIndex={0}`, an
   `onKeyDown` handler (Enter/Space triggers `onClick`), and a focus-visible ring matching
   `IconButton`/`Button`'s pattern. Found via a real accessibility audit
   (`add-quality-hardening`, phase 8) — a genuine WCAG 2.1.1 (Keyboard) failure, not a
   style preference.
5. `NoteCard`: `snippet` now renders via `dangerouslySetInnerHTML` instead of as plain
   React text, so note previews on cards (notes list, folders, tags, search, trash) show
   rendered Markdown (headings, lists, checklists, code) instead of literal Markdown syntax
   like `# Heading`. Callers must pass pre-sanitized HTML — see `lib/markdown/snippet.ts`,
   which truncates the raw Markdown then runs it through the same `renderMarkdown` +
   `sanitizeServerHtml` pipeline as the note editor's Preview. Companion CSS
   (`.note-card-snippet` in `app/globals.css`) keeps headings/lists/code at the card's
   compact body size instead of full heading scale.
6. `NoteCard`: the Favorite/Pin buttons' `onClick` handlers now call `e.preventDefault()`
   in addition to the existing `e.stopPropagation()`. Found via real browser testing
   (`add-note-organization`): the notes list wraps each `NoteCard` in a Next.js `<Link>` so
   cards are real anchors (keeps ctrl/cmd-click "open in new tab" working); `stopPropagation`
   alone only stops React's synthetic event from reaching the card's own `onClick`, it does
   not stop the browser's native default action of following the enclosing `<a href>`.
   Without `preventDefault()`, clicking the star/pin on a card in the list correctly toggled
   the flag but also navigated into the note editor — not what a quick list-view toggle
   should do.

## Component inventory (26)

- **core** — Button, IconButton, Badge, Tag, Avatar, Divider, Tooltip
- **forms** — Input, SearchField, Select, Checkbox, Radio, Switch
- **layout** — Card, Tabs, Modal
- **feedback** — Toast, Alert, ProgressBar, Skeleton, EmptyState, Spinner
- **notes** — NoteCard, FolderItem, ChecklistItem, EditorToolbar

Each has a `.d.ts` with full prop docs, and the core/forms/layout/notes groups have a
`*.prompt.md` usage guide alongside them.

## What's not built yet

Per the source readme: Textarea, PasswordField, Autocomplete/Dropdown menu, Drawer,
BottomSheet, Breadcrumb, Pagination, DatePicker/Calendar, FAB, Accordion, Snackbar (distinct
from Toast), List Item, Navigation Bar. Build these the same way — plain component + CSS
variables from `tokens/`, `"use client"` if interactive, typed via a co-located `.d.ts`.
