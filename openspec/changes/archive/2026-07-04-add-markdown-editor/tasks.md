## 1. Dependencies and shared Markdown/sanitization config

- [x] 1.1 Add `marked`, `sanitize-html`, `dompurify` (plus `@types/sanitize-html` if not
      bundled) to `package.json`
- [x] 1.2 Add `lib/markdown/allowlist.ts`: shared tag/attribute allowlist constant (`h1`, `h2`,
      `p`, `br`, `ul`, `ol`, `li`, `code`, `pre`, `input[type=checkbox][disabled]`) consumed by
      both sanitizers
- [x] 1.3 Add `lib/markdown/render.ts`: `renderMarkdown(content: string): string` wrapping
      `marked.parse` with `gfm: true` (no sanitization inside this function — callers sanitize)
- [x] 1.4 Add `lib/markdown/sanitize.server.ts`: `sanitizeServerHtml(html: string): string`
      using `sanitize-html` with the shared allowlist — spot-checked: `<script>` fully
      removed, `<strong>`/`<a>` unwrapped to plain text
- [x] 1.5 Add `lib/markdown/sanitize.client.ts` (`"use client"` or plain client-safe module):
      `sanitizeClientHtml(html: string): string` using `dompurify` with the shared allowlist

## 2. Hand-rolled toolbar icons

- [x] 2.1 Add `IconHeading1`, `IconHeading2`, `IconListBullet`, `IconListOrdered`,
      `IconListChecks`, `IconCode` to `components/icons.tsx`, matching the existing hand-rolled
      SVG style (`defaults` props, 24x24 viewBox)

## 3. Formatting toolbar and textarea manipulation

- [x] 3.1 Add `lib/markdown/editing.ts`: pure functions for each of the six actions
      (`applyHeading(text, selectionStart, selectionEnd, level)`,
      `applyListPrefix(text, selectionStart, selectionEnd, prefix)`,
      `applyCodeFormatting(text, selectionStart, selectionEnd)`), each returning the new text
      plus the new selection range, operating on the current line for line-prefix actions —
      spot-checked with `tsx`: headings/lists/code all apply and replace-not-stack correctly
- [x] 3.2 Add `components/notes/editor-toolbar.tsx`: 6 buttons (using the new icons), each
      `title` showing its keyboard shortcut, calling an `onAction` callback with the action name
- [x] 3.3 Wire `editor-toolbar.tsx` into `components/notes/note-editor.tsx`: on each action,
      read the textarea's current selection via a ref (added `React.forwardRef` to
      `components/ui/textarea.tsx`), call the matching `lib/markdown/editing.ts` function,
      update content state, restore focus/selection on the textarea, and trigger the existing
      autosave debounce

## 4. Keyboard shortcuts

- [x] 4.1 Add a `keydown` handler on the content textarea in `note-editor.tsx` recognizing
      `Mod+Alt+1`/`Mod+Alt+2` (headings), `Mod+Shift+7`/`Mod+Shift+8` (ordered/bullet list),
      `Mod+Shift+9` (checklist), and `Mod+E` (code) — `Mod` is `metaKey || ctrlKey`. Uses
      `event.code` (`Digit1`, `Digit7`, etc.) rather than `event.key`, since `event.key` reports
      the shifted symbol (e.g. `&` for Shift+7 on a US layout), not the digit
- [x] 4.2 Each shortcut calls `event.preventDefault()` and invokes the same handler path as its
      corresponding toolbar action (no duplicated logic between shortcut and button)

## 5. Write/Preview toggle and rendering

- [x] 5.1 Add `components/notes/note-preview.tsx`: dumb renderer taking a pre-sanitized `html`
      string via `dangerouslySetInnerHTML` — computing *which* sanitizer ran moved to
      `NoteEditor` (see 5.3) so both sanitization paths are genuinely exercised rather than one
      being redundant
- [x] 5.2 Add a Write/Preview segmented toggle to `note-editor.tsx`'s header area (next to the
      save-status indicator); Preview hides the textarea and toolbar, shows `NotePreview`;
      Write shows them again, defaulting to Write on load
- [x] 5.3 Update `app/(dashboard)/notes/[id]/page.tsx` to compute
      `sanitizeServerHtml(renderMarkdown(note.content))` once and pass it to `NoteEditor` as
      `initialPreviewHtml`; `NoteEditor` memoizes preview HTML as
      `content === initialContent ? initialPreviewHtml : sanitizeClientHtml(renderMarkdown(content))`
      so unedited notes show genuine server-sanitized HTML and any edit switches to genuine
      client-sanitized HTML

## 6. Verification

- [x] 6.1 Manual/browser check: each of the six toolbar buttons applies the correct Markdown
      syntax; each of the five keyboard shortcuts (heading has two) applies the same syntax —
      verified via Playwright driving system Chrome for all six toolbar buttons plus the
      Ctrl+Alt+1 shortcut; heading-level switching confirmed to replace rather than stack
- [x] 6.2 Manual/browser check: switch to Preview, confirm headings/lists/checklist/code
      render as real HTML elements, and switch back to Write with content/cursor intact —
      verified (h1/checkbox/code element counts asserted; content intact after switching back)
- [x] 6.3 Manual/browser check (XSS): type `<script>alert(1)</script>` as note content, switch
      to Preview, confirm no alert fires and no `<script>` tag exists in the rendered DOM —
      verified with both a `<script>` tag and an `onerror`-bearing `<img>` payload; no dialog
      fired, no `script`/`img` tags reached the preview DOM. Also independently confirmed via
      a direct (non-browser) inspection of the raw SSR response that Next's RSC payload
      escapes `<`/`/` as `<` in serialized props (no premature-`</script>`-termination
      risk) and that `sanitizeServerHtml` strips the tag before `initialPreviewHtml` is ever
      computed
- [x] 6.4 Manual/browser check: type Markdown for an unsupported action (e.g. `**bold**` or
      `[link](https://example.com)`), confirm Preview does not render it as `<strong>`/`<a>` —
      verified: renders as plain text instead
- [x] 6.5 Run `npm run lint`, `tsc --noEmit`, and `npm run build` clean — all three pass with
      zero errors (pre-existing vendored-file warnings only)

**Note on verification methodology:** an early pass of these checks appeared to intermittently
fail on the "does content survive a reload" step. Root-caused to a bug in the *test script*,
not the app: Playwright's `text=` selector does case-insensitive substring matching, so
`page.waitForSelector("text=Saved")` was matching the `"Unsaved changes"` (pending) status
label and resolving before the real 1s-debounced save had actually completed, so the test
sometimes reloaded before the write landed. Fixed by asserting the status element's exact
text via `page.waitForFunction(...)` instead. Re-ran all checks 3+ times consecutively after
the fix with no failures; also confirmed directly against the database that `updateNote`
persists correctly. No application code changed as a result of this investigation.
