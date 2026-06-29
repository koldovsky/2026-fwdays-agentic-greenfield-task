import { NoteCard } from '@/components/ds/book/NoteCard'
import { parseLink, linkHref } from '@/lib/content/links'
import type { Note } from '@/lib/content/types'

export function NoteCardView({ note }: { note: Note }) {
  const links = note.links.map((raw) => parseLink(raw)).filter((l) => l !== null)
  return (
    <div id={note.id} style={{ marginBottom: 'var(--space-4)' }}>
      <NoteCard
        color={note.color}
        excerpt={note.excerpt}
        note={note.body || undefined}
        page={note.page}
        links={links.length}
      />
      {links.length > 0 && (
        <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
          {links.map((l) => (
            <li key={linkHref(l!)}>
              <a href={linkHref(l!)}>{l!.type === 'book' ? l!.slug : `${l!.slug}/${l!.noteId}`}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
