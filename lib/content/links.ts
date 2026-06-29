import type { Book, Note } from './types'

export type ParsedLink =
  | { type: 'book'; slug: string }
  | { type: 'note'; slug: string; noteId: string }

export interface Backlink {
  fromBook: string
  fromNote: string | null
}

export function parseLink(s: string): ParsedLink | null {
  const book = /^book:([^/\s]+)$/.exec(s)
  if (book) return { type: 'book', slug: book[1] }
  const note = /^note:([^/\s]+)\/([^/\s]+)$/.exec(s)
  if (note) return { type: 'note', slug: note[1], noteId: note[2] }
  return null
}

export function linkKey(l: ParsedLink): string {
  return l.type === 'book' ? `book:${l.slug}` : `note:${l.slug}/${l.noteId}`
}

export function linkHref(l: ParsedLink): string {
  return l.type === 'book' ? `/book/${l.slug}` : `/book/${l.slug}#${l.noteId}`
}

export function buildBacklinkIndex(
  books: Book[],
  notesByBook: Record<string, Note[]>,
): Map<string, Backlink[]> {
  const index = new Map<string, Backlink[]>()
  const add = (target: string, source: Backlink) => {
    const list = index.get(target) ?? []
    list.push(source)
    index.set(target, list)
  }
  for (const book of books) {
    for (const note of notesByBook[book.slug] ?? []) {
      for (const raw of note.links) {
        const parsed = parseLink(raw)
        if (parsed) add(linkKey(parsed), { fromBook: book.slug, fromNote: note.id })
      }
    }
  }
  return index
}

export function isBrokenLink(
  l: ParsedLink,
  known: { bookSlugs: Set<string>; noteKeys: Set<string> },
): boolean {
  return l.type === 'book' ? !known.bookSlugs.has(l.slug) : !known.noteKeys.has(linkKey(l))
}
