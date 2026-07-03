# Notely App — UI kit

Interactive recreation of the Notely note-taking app. Composes the design-system primitives — does not re-implement them.

## Screens
- **Sidebar.jsx** — brand, New note, smart folders, user folders, tags, trash/settings, account.
- **NotesView.jsx** — top bar (search, sort, grid/list toggle), Pinned + Others sections of `NoteCard`s.
- **EditorView.jsx** — full-page editor: title, tags, `EditorToolbar`, body, action-item checklist, share/save chrome.
- **SettingsView.jsx** — account card + appearance/sync rows with `Switch`/`Select`. Dark-theme toggle flips `data-theme`.
- **App.jsx** — shell + state (active folder, search, layout, open note, theme, toast).

## Run
Open `index.html`. Click a note to open the editor, use the search/sort/layout controls, open Settings to toggle dark theme, click New note for the toast.

All components come from `window.NotelyDesignSystem_fd4cb3`; icons via Lucide CDN. This is a cosmetic recreation — interactions are faked.
