# Bookshelf — Component Catalog (reference)

Authoritative contracts: `docs/design-system/components/<group>/<Name>.d.ts` and
`.prompt.md`. Import (after vendoring, see SKILL.md) from
`@/components/ds/<group>/<Name>`. All components style via tokens + inline `style` and
accept a `style` prop for layout overrides. Interactive ones must be client components.

## book/ (domain)

### BookCard — a book on the shelf
```ts
BookCard(props: {
  title: string
  author?: string
  cover?: 'blue'|'coral'|'teal'|'purple'|'amber'|'green'|'ink'  // generated cover, default 'ink'
  coverSrc?: string        // image URL — overrides generated cover
  rating?: number          // 1–10
  status?: 'reading'|'finished'|'toread'
  tags?: string[]          // hashtags without '#'
  notes?: number           // note count
  onClick?: () => void
  style?: React.CSSProperties
})
```
Renders a generated gradient cover (or image), title (serif), author, `Rating`,
tags, and a notes count. For navigation, wrap in a `next/link` rather than passing a
server-side `onClick`.

### NoteCard — a reading note
```ts
NoteCard(props: {
  color?: HighlighterKey   // default 'yellow' — left spine + excerpt mark
  excerpt?: string         // quoted passage, painted in the highlighter
  note?: string            // your reflection (plain text)
  page?: number
  tags?: string[]
  links?: number           // count of linked notes/books (badge only)
  book?: string            // source book title (when listed outside a book page)
  onClick?: () => void
  style?: React.CSSProperties
})
```
NoteCard shows a links **count**, not the list. To render clickable outbound links,
wrap NoteCard in an adapter (e.g. `NoteCardView`) that renders the resolved links
beside it.

### Rating — 1–10 score
```ts
Rating(props: { value?: number; readOnly?: boolean; size?: 'sm'|'md' /* + see .d.ts */ })
```

### HighlighterPicker — choose a note color
```ts
type HighlighterKey = 'yellow'|'amber'|'coral'|'pink'|'purple'|'blue'|'teal'|'green'
HighlighterPicker(props: {
  value?: HighlighterKey
  onChange?: (key: HighlighterKey) => void
  size?: 'sm'|'md'         // default 'md'
  style?: React.CSSProperties
})
export const HIGHLIGHTER_KEYS: HighlighterKey[]
```

## core/

### Button
```ts
Button(props: {
  variant?: 'primary'|'secondary'|'ghost'|'soft'|'danger'  // default 'primary'
  size?: 'sm'|'md'|'lg'                                     // default 'md'
  iconLeft?: ReactNode; iconRight?: ReactNode
  block?: boolean; disabled?: boolean; type?: string
  children; style?
})
```
`primary` (ballpoint-blue solid) is the single strong action per view; everything
else is quieter.

### Input / Textarea / Select (form fields, extend native attributes)
```ts
Input(props: InputHTMLAttributes & { label?; hint?; error?; iconLeft?; size?: 'sm'|'md' })
Textarea(props: TextareaHTMLAttributes & { label?; hint?; ruled?: boolean })  // ruled = notebook paper + serif
Select(props: SelectHTMLAttributes & { label?; hint?; options?: (string | {value;label})[]; size? })
```
They forward native attributes — `name`, `defaultValue`, `required`, `type`, etc. —
so they drop straight into a `<form action={serverAction}>`. Use `ruled` on Textarea
for note/summary writing.

### Others
`IconButton`, `Switch`, `Checkbox` — see their `.d.ts`/`.prompt.md`.

## navigation/ · display/
- `navigation/Tabs`.
- `display/Card`, `display/Badge`, `display/Tag`, `display/Avatar`.

See the `.prompt.md` next to each component for usage examples before composing.
