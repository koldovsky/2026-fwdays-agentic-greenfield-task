import { listBooks } from './books'
import { listNotes } from './notes'
import { buildBacklinkIndex, type Backlink } from './links'
import type { Note } from './types'

export async function loadBacklinkIndex(): Promise<Map<string, Backlink[]>> {
  const books = await listBooks()
  const notesByBook: Record<string, Note[]> = {}
  await Promise.all(
    books.map(async (b) => {
      notesByBook[b.slug] = await listNotes(b.slug)
    }),
  )
  return buildBacklinkIndex(books, notesByBook)
}

export async function loadLinkTargets(): Promise<{ value: string; label: string }[]> {
  const books = await listBooks()
  const targets: { value: string; label: string }[] = []
  for (const book of books) {
    targets.push({ value: `book:${book.slug}`, label: `📕 ${book.title}` })
    const notes = await listNotes(book.slug)
    for (const note of notes) {
      const preview = (note.excerpt ?? note.body).slice(0, 40).replace(/\n/g, ' ')
      targets.push({ value: `note:${book.slug}/${note.id}`, label: `↳ ${book.title}: ${preview || note.id}` })
    }
  }
  return targets
}
