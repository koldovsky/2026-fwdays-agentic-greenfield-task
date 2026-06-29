import { describe, it, expect, afterEach } from 'vitest'
import path from 'node:path'
import { contentRoot, booksDir, bookDir, bookFile, notesDir, noteFile } from './paths'

afterEach(() => {
  delete process.env.BOOKSHELF_CONTENT_DIR
})

describe('paths', () => {
  it('uses BOOKSHELF_CONTENT_DIR when set', () => {
    process.env.BOOKSHELF_CONTENT_DIR = '/tmp/bs'
    expect(contentRoot()).toBe('/tmp/bs')
  })

  it('falls back to cwd/content', () => {
    expect(contentRoot()).toBe(path.join(process.cwd(), 'content'))
  })

  it('builds book and note paths', () => {
    process.env.BOOKSHELF_CONTENT_DIR = '/tmp/bs'
    expect(booksDir()).toBe('/tmp/bs/books')
    expect(bookDir('deep-work')).toBe('/tmp/bs/books/deep-work')
    expect(bookFile('deep-work')).toBe('/tmp/bs/books/deep-work/book.md')
    expect(notesDir('deep-work')).toBe('/tmp/bs/books/deep-work/notes')
    expect(noteFile('deep-work', 'n-1')).toBe('/tmp/bs/books/deep-work/notes/n-1.md')
  })
})
