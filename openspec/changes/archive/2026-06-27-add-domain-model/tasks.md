## 1. Types

- [x] 1.1 Implement `lib/content/types.ts`: `BookStatus`, `CoverColor`, `HighlighterKey`, `BookMeta`, `Book` (adds slug, body, malformed), `Note` (id, color, excerpt?, page?, links[], body)

## 2. Colors

- [x] 2.1 Write a failing test `lib/content/colors.test.ts`: `NOTE_COLORS` has 8 entries each with a non-empty label; `DEFAULT_NOTE_COLOR === 'yellow'`; `isNoteColor('green')` true; `isNoteColor('chartreuse')` false
- [x] 2.2 Run the test — confirm it fails (module missing)
- [x] 2.3 Implement `lib/content/colors.ts`: `NOTE_COLORS` (8 keys + English labels), `DEFAULT_NOTE_COLOR`, `isNoteColor`
- [x] 2.4 Run the test — confirm it passes

## 3. Verify

- [x] 3.1 Run `npx tsc --noEmit` — types compile cleanly
- [x] 3.2 Run the full test suite — all green
