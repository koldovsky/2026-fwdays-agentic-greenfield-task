import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseBook, serializeBook, readBook, listBooks, createBook, updateBook } from './books'
import type { BookMeta } from './types'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bs-books-'))
  process.env.BOOKSHELF_CONTENT_DIR = dir
})
afterEach(async () => {
  delete process.env.BOOKSHELF_CONTENT_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const meta: BookMeta = {
  title: 'Atomic Habits',
  author: 'James Clear',
  status: 'finished',
  rating: 9,
  tags: ['nonfiction', 'psychology'],
  summary: 'Short summary',
}

describe('parseBook', () => {
  it('parses a valid book', () => {
    const raw = serializeBook({ slug: 'x', body: 'Body', malformed: false, ...meta })
    const book = parseBook('x', raw)
    expect(book.title).toBe('Atomic Habits')
    expect(book.tags).toEqual(['nonfiction', 'psychology'])
    expect(book.body).toBe('Body')
    expect(book.malformed).toBe(false)
  })

  it('marks malformed when required fields missing', () => {
    const book = parseBook('x', '---\nrating: 9\n---\nbody')
    expect(book.malformed).toBe(true)
    expect(book.title).toBe('x') // falls back to slug
    expect(book.tags).toEqual([])
    expect(book.status).toBe('toread')
  })
})

describe('round-trip', () => {
  it('serializes then parses to the same data', () => {
    const original = { slug: 'x', body: 'Body text', malformed: false, ...meta }
    expect(parseBook('x', serializeBook(original))).toEqual(original)
  })
})

describe('store', () => {
  it('createBook writes and returns a slug', async () => {
    const slug = await createBook(meta, 'Body')
    expect(slug).toBe('atomic-habits')
    const book = await readBook(slug)
    expect(book?.title).toBe('Atomic Habits')
    expect(book?.body).toBe('Body')
  })

  it('createBook avoids slug collisions', async () => {
    const a = await createBook(meta)
    const b = await createBook(meta)
    expect(a).toBe('atomic-habits')
    expect(b).toBe('atomic-habits-2')
  })

  it('readBook returns null when missing', async () => {
    expect(await readBook('nope')).toBeNull()
  })

  it('listBooks returns books sorted by title', async () => {
    await createBook({ ...meta, title: 'Zebra' })
    await createBook({ ...meta, title: 'Apple' })
    const books = await listBooks()
    expect(books.map((b) => b.title)).toEqual(['Apple', 'Zebra'])
  })

  it('updateBook overwrites metadata and body', async () => {
    const slug = await createBook(meta, 'Body')
    await updateBook(slug, { ...meta, rating: 5 }, 'New body')
    const book = await readBook(slug)
    expect(book?.rating).toBe(5)
    expect(book?.body).toBe('New body')
  })
})
