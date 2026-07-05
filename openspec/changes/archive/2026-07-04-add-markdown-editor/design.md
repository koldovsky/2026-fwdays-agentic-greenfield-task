## Context

`notes-core` shipped `components/notes/note-editor.tsx` (a `"use client"` component with a
title `Input`, a content `Textarea`, 1s-debounced autosave, and a save-status indicator) and
`components/ui/textarea.tsx` (a minimal styled `<textarea>`, explicitly built as a placeholder
for "a real editor component later" — this change is that later). `Note.content` is stored as
a plain string; nothing in the app currently turns it into HTML, so SEC-004 has had nothing to
sanitize yet. The Notely design system ships `EditorToolbar`, but it hardcodes all 13
buttons (bold, italic, underline, strikethrough, heading-1, heading-2, quote, list,
list-ordered, list-checks, link, code, image) with no prop to filter which appear, and renders
every icon via `<i data-lucide="...">` — the same non-functional-icon gap already worked
around in `notes-core` (`NoteEmptyState`) and `folders-tags` (`SidebarFolderRow`/
`SidebarTagRow`) by hand-rolling a replacement instead.

The user confirmed the phase scope is exactly `docs/openspec-capabilities.md`'s enumerated
list — headings, lists, code, checklists — not the PRD's fuller "tables, syntax highlighting,
drag-drop images, slash commands" wishlist, and not bold/italic either.

## Goals / Non-Goals

**Goals:**
- A formatting toolbar with exactly six actions: Heading 1, Heading 2, bullet list, numbered
  list, checklist, code — each inserting the correct Markdown syntax at the cursor/selection.
- A keyboard shortcut for each of the six actions (UI-002).
- A Write/Preview toggle in the editor; Preview renders the note's Markdown as sanitized HTML.
- Both a server-side and a client-side sanitization pass, each independently capable of
  stripping unsafe HTML before it reaches the DOM (SEC-004).

**Non-Goals:**
- Tables, drag-drop image upload, code syntax highlighting, slash commands — explicitly cut
  from the PRD's fuller wishlist for this phase per the capability breakdown.
- Bold, italic, underline, strikethrough, blockquote, link, and image toolbar buttons or
  keyboard shortcuts — confirmed out of scope with the user.
- Changing the notes list (`NoteCard`) snippet to render Markdown — it stays a plain-text
  truncated preview; no XSS surface there since it's rendered as React text content, never
  `dangerouslySetInnerHTML`.
- A WYSIWYG/rich-text editing surface (e.g. ProseMirror/TipTap/Slate) — the editor stays a
  raw-Markdown textarea with toolbar-assisted syntax insertion, matching the lightweight
  approach `notes-core` already established and avoiding a new heavy dependency.

## Decisions

**1. Toolbar is hand-rolled (`components/notes/editor-toolbar.tsx`), not the vendored
`EditorToolbar`.**
The vendored component always renders all 13 buttons with `<i data-lucide>` icons; there's no
way to show only 6, and the other 7 would be dead, unrendered-icon buttons doing nothing —
exactly the kind of half-finished UI the project avoids. A small custom toolbar with 6 buttons,
using new hand-rolled SVGs in `components/icons.tsx` (`IconHeading1`, `IconHeading2`,
`IconListBullet`, `IconListOrdered`, `IconListChecks`, `IconCode`), keeps every visible button
functional and matches the icon style already established.

**2. Toolbar actions manipulate the textarea directly via its DOM selection, not a rich-text
model.**
Each action (e.g. "Heading 1") reads `textarea.selectionStart`/`selectionEnd`, inserts or wraps
the appropriate Markdown syntax, updates React state, and restores cursor position — the same
approach used by lightweight Markdown editors (e.g. GitHub's comment box). Line-prefix actions
(headings, lists, checklist) apply to the start of the current line; `code` wraps the current
selection inline with backticks if it's non-empty and single-line, or inserts a fenced
triple-backtick block (cursor placed inside) if the selection is empty or multi-line.
*Alternative considered:* a contenteditable/rich-text model that stores rendered state and
serializes to Markdown. Rejected — significantly more complexity and a new dependency for a
phase scoped to six formatting actions.

**3. Keyboard shortcuts use `Mod+Alt+1`/`Mod+Alt+2` (headings), `Mod+Shift+7`/`Mod+Shift+8`
(ordered/bullet list, matching the Word/Docs/Slack convention), `Mod+Shift+9` (checklist,
extending that same convention), and `Mod+E` (code).**
`Mod` is `metaKey` on Mac, `ctrlKey` elsewhere (checked via `event.metaKey || event.ctrlKey`,
consistent with how most cross-platform web apps detect the platform-appropriate modifier
without needing user-agent sniffing). These specific bindings were chosen to avoid colliding
with common browser/OS shortcuts (e.g. `Mod+B`/`Mod+I` are reserved for a future bold/italic
phase, not used here since those actions are out of scope). Each toolbar button's `title`
attribute includes its shortcut (e.g. "Heading 1 (Ctrl+Alt+1)") for discoverability, since
there's no onboarding tour or shortcut-list UI in scope.

**4. Sanitizer allowlist is scoped to exactly what the six supported actions can produce, not
a general Markdown/CommonMark allowlist.**
Allowed tags: `h1`, `h2`, `p`, `br`, `ul`, `ol`, `li`, `code`, `pre`, and `input` (only
`type="checkbox"` `disabled`, for GFM task-list items). No `strong`/`em`/`a`/`img`/`table`/
`blockquote`, and no raw HTML passthrough (CommonMark allows literal HTML in Markdown source
by default — `marked` preserves it in output — so an unsanitized render would let a user type
`<script>` directly into their note content). If a user hand-types `**bold**` or
`[link](url)`, `marked` will still parse it into `<strong>`/`<a>` in its output, but the
sanitizer strips those tags (unwrapping to plain text) since they're not in the allowlist —
this is intentional: the six supported actions are the only formatting this phase claims to
support, and silently rendering unsupported syntax typed by hand (while not exposing a
toolbar/shortcut for it) would be an inconsistent, confusing half-feature.
*Alternative considered:* allow bold/italic/links to render even without toolbar affordances,
since `marked` produces them for free. Rejected per the scope decision above — deliberately
narrow allowlist keeps "what you can format" and "what actually renders" the same thing.

**5. Two independent sanitization passes — `sanitize-html` server-side, `dompurify`
client-side — genuinely both exercised, not one path with an inert fallback.**
`app/(dashboard)/notes/[id]/page.tsx` (a Server Component) computes
`sanitizeServerHtml(renderMarkdown(note.content))` once for the note's last-saved content and
passes it into `NoteEditor` as `initialPreviewHtml`. `NoteEditor` memoizes the HTML shown in
Preview as: `content === initialContent ? initialPreviewHtml : sanitizeClientHtml(renderMarkdown(content))`
— i.e. as long as the user hasn't changed anything since load, Preview shows the real
server-sanitized HTML with no redundant client recomputation; the moment any edit happens, the
client path (`dompurify`) takes over and stays authoritative, since that content has no server
round trip to sanitize before it's shown. This keeps both sanitizers doing genuine,
non-redundant work in ordinary usage (open a note and preview it unedited → server path; type
something and preview → client path) rather than one being dead code that merely satisfies the
letter of the requirement. `components/notes/note-preview.tsx` itself does no
computation — it's a dumb renderer that trusts whichever pre-sanitized `html` string
`NoteEditor` hands it. `sanitize-html` is Node-native (no DOM needed) so it fits the Server
Component cleanly; `dompurify` is browser-DOM-based so it fits the client path. Using one
library for both would mean either shipping a DOM shim (`jsdom`) to the server for no benefit,
or running `sanitize-html` in the browser where it isn't needed. Both paths apply the exact
same allowlist (shared constant in `lib/markdown/allowlist.ts`) so behavior is identical
regardless of which sanitizer ran.

**6. `marked` is configured with `gfm: true` (default) for GFM task-list syntax
(`- [ ] item"), and Markdown parsing has no built-in sanitization relied upon.**
Modern `marked` versions don't offer a maintained built-in sanitizer and explicitly delegate
that responsibility to the consuming app — matching decision 5's approach exactly.

## Risks / Trade-offs

- **[Risk]** A user who manually types Markdown outside the six supported actions (bold,
  links, etc.) sees it silently stripped down to plain text in Preview, which could read as a
  bug rather than a scope boundary. → **Mitigation**: accepted per the explicit scope decision
  with the user; worth a short explanatory microcopy line near the Preview toggle if user
  feedback flags it as confusing (not added now — no requirement calls for it).
- **[Risk]** Toolbar actions manipulating raw textarea selection can behave slightly
  differently across browsers for edge cases (e.g. selection spanning a line boundary exactly).
  → **Mitigation**: line-prefix actions always operate on whichever line contains
  `selectionStart`, keeping the logic simple and predictable rather than trying to handle
  every multi-line selection permutation.
- **[Trade-off]** Two sanitizer libraries (`sanitize-html` + `dompurify`) instead of one mean
  slightly more dependency surface than a single isomorphic sanitizer (e.g.
  `isomorphic-dompurify`, which bundles `jsdom` for server use). Chosen anyway because it
  avoids shipping a full DOM shim to the server for a Server Component that already has no
  need for one, and keeps each sanitizer running in its native environment.

## Migration Plan

No schema migration. Deploy is a normal code push: new formatting/rendering code, three new
npm dependencies (`marked`, `sanitize-html`, `dompurify`), editor UI additions. No feature flag
needed — existing notes render exactly as before in Write mode; Preview mode is new and
additive.

## Open Questions

- Should Preview mode be remembered per-note or always default to Write? **Decision for this
  change:** always default to Write on load — simplest, and consistent with `notes-core`'s
  "one screen" editor model where editing is the primary action.
