## Why

`notes-core` shipped a plain `<textarea>` for note content, which satisfies FR-021 but gives
no Markdown formatting, no keyboard shortcuts (UI-002), and no rendered view of the note at
all — raw Markdown syntax (`# `, `- [ ] `, etc.) is what the user sees, with no path to
becoming sanitized HTML (SEC-004 is currently unaddressed since nothing renders Markdown to
HTML yet). This change upgrades the editor and closes the XSS gap before any Markdown ever
reaches the DOM as HTML.

## What Changes

- Add a small custom formatting toolbar above the note content field, supporting exactly the
  phase-scoped feature set: Heading 1, Heading 2, bullet list, numbered list, checklist, and
  code (inline or fenced, based on selection) — confirmed with the user to match
  `docs/openspec-capabilities.md`'s phase 5 deliverables literally, not the PRD's fuller
  wishlist (no bold/italic/tables/images/syntax-highlighting/slash-commands this phase).
- Add matching keyboard shortcuts for each of the six toolbar actions.
- Add a Write/Preview toggle: Write shows the raw-Markdown textarea (unchanged editing
  experience); Preview renders the current content as sanitized HTML.
- Add Markdown-to-HTML rendering (`marked`) with two independent sanitization passes:
  server-side (`sanitize-html`, for the initial page-load render of the note's last-saved
  content) and client-side (`dompurify`, for the live preview of unsaved edits, which never
  makes a server round trip). Both enforce the same strict allowlist.
- The sanitizer allowlist is deliberately narrow: only the tags the six supported toolbar
  actions can produce (headings, paragraphs, lists, checklist items, code/pre) are allowed.
  Raw HTML in a note's Markdown source, and Markdown syntax for anything outside the six
  supported actions (bold, italic, links, images, tables) are stripped even if a user
  hand-types the syntax — see design.md for the full rationale.

**Non-goals:** tables, drag-drop image upload, syntax highlighting inside code blocks,
slash commands, bold/italic toolbar buttons or shortcuts. `Note.content` remains a plain
string column — no schema change.

## Capabilities

### New Capabilities
- `markdown-editor`: formatting toolbar, keyboard shortcuts, and sanitized Markdown rendering
  for note content (UI-002, SEC-004).

### Modified Capabilities
- (none — `notes-core`'s note editor component is extended, not changed at the requirement
  level; FR-021 "edit existing notes" is still satisfied the same way)

## Impact

- **New dependencies:** `marked` (Markdown → HTML, no DOM dependency), `sanitize-html`
  (server-side sanitization), `dompurify` (client-side sanitization, browser DOM-based).
- **New code:** `lib/markdown/render.ts` (shared `marked` config + allowlist definition),
  `lib/markdown/sanitize.server.ts` (`sanitize-html`-based), `lib/markdown/sanitize.client.ts`
  (`dompurify`-based), `components/notes/editor-toolbar.tsx` (hand-rolled, since the vendored
  `EditorToolbar` hardcodes 13 unfilterable buttons and would show dead icons for out-of-scope
  actions), `components/notes/note-preview.tsx` (renders sanitized HTML).
- **Existing code touched:** `components/notes/note-editor.tsx` (mounts toolbar, Write/Preview
  toggle, keyboard shortcut handler), `components/icons.tsx` (new hand-rolled icons: heading-1,
  heading-2, list, list-ordered, list-checks/checklist, code — continuing the project's
  established pattern of avoiding the vendored components' `data-lucide` dependency),
  `app/(dashboard)/notes/[id]/page.tsx` (computes the server-sanitized initial preview HTML).
- **Data:** no schema changes.
