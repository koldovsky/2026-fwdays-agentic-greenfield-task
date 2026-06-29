import path from 'node:path'

export function contentRoot(): string {
  return process.env.BOOKSHELF_CONTENT_DIR ?? path.join(process.cwd(), 'content')
}

export function booksDir(): string {
  return path.join(contentRoot(), 'books')
}

export function bookDir(slug: string): string {
  return path.join(booksDir(), slug)
}

export function bookFile(slug: string): string {
  return path.join(bookDir(slug), 'book.md')
}

export function notesDir(slug: string): string {
  return path.join(bookDir(slug), 'notes')
}

export function noteFile(slug: string, id: string): string {
  return path.join(notesDir(slug), `${id}.md`)
}
