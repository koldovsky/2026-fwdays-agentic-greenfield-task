# Notes components — NoteCard, FolderItem, ChecklistItem, EditorToolbar

Product-specific building blocks for the Notes app.

```jsx
<NoteCard title="Weekly review" snippet="Three wins…" date="2 min ago"
  tags={[{label:"Work",color:"#4f46e5"}]} pinned favorite
  onTogglePin={pin} onToggleFavorite={fav} />

<FolderItem name="Personal" count={12} color="#0d9488" active />
<FolderItem name="Archive" icon="archive" count={5} />

<ChecklistItem checked text="Draft the spec" onToggle={t} />
<EditorToolbar active={{bold:true}} onAction={cmd} />
```

- **NoteCard** — `layout="grid"` (tile) or `"list"` (row). Hover reveals pin/favorite; pinned/favorited stay lit. `color` shows an accent bar in list layout.
- **FolderItem** — sidebar row; `color` dot replaces the icon, `depth` indents nested folders.
- **ChecklistItem** — to-do row; `editable` swaps text for an input.
- **EditorToolbar** — formatting bar; `onAction` receives the Lucide action name.

All use Lucide icons — ensure `lucide.createIcons()` runs after mount.
