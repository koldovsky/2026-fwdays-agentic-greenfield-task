import type { Book } from './types'

const UNTAGGED = 'Untagged'

export function groupBooksByTag(books: Book[]): { tag: string; books: Book[] }[] {
  const byTag = new Map<string, Book[]>()
  for (const book of books) {
    const tags = book.tags.length > 0 ? book.tags : [UNTAGGED]
    for (const tag of tags) {
      const list = byTag.get(tag) ?? []
      list.push(book)
      byTag.set(tag, list)
    }
  }
  return [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, books]) => ({ tag, books }))
}
