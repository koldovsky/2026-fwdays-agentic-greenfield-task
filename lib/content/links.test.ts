import { describe, it, expect } from 'vitest'
import { parseLink, linkKey, linkHref, buildBacklinkIndex, isBrokenLink } from './links'
import type { Book, Note } from './types'

describe('parseLink', () => {
  it('parses book links', () => {
    expect(parseLink('book:deep-work')).toEqual({ type: 'book', slug: 'deep-work' })
  })
  it('parses note links', () => {
    expect(parseLink('note:deep-work/n-x9')).toEqual({ type: 'note', slug: 'deep-work', noteId: 'n-x9' })
  })
  it('returns null for garbage', () => {
    expect(parseLink('nonsense')).toBeNull()
    expect(parseLink('note:deep-work')).toBeNull()
  })
})

describe('linkKey / linkHref', () => {
  it('builds keys', () => {
    expect(linkKey({ type: 'book', slug: 'a' })).toBe('book:a')
    expect(linkKey({ type: 'note', slug: 'a', noteId: 'n-1' })).toBe('note:a/n-1')
  })
  it('builds hrefs', () => {
    expect(linkHref({ type: 'book', slug: 'a' })).toBe('/book/a')
    expect(linkHref({ type: 'note', slug: 'a', noteId: 'n-1' })).toBe('/book/a#n-1')
  })
})

describe('buildBacklinkIndex', () => {
  it('indexes who links to each target', () => {
    const books: Book[] = [
      { slug: 'a', title: 'A', author: '', status: 'finished', tags: [], body: '', malformed: false },
      { slug: 'b', title: 'B', author: '', status: 'finished', tags: [], body: '', malformed: false },
    ]
    const notesByBook: Record<string, Note[]> = {
      a: [{ id: 'n-1', color: 'yellow', links: ['book:b'], body: '' }],
      b: [{ id: 'n-9', color: 'yellow', links: ['note:a/n-1'], body: '' }],
    }
    const index = buildBacklinkIndex(books, notesByBook)
    expect(index.get('book:b')).toEqual([{ fromBook: 'a', fromNote: 'n-1' }])
    expect(index.get('note:a/n-1')).toEqual([{ fromBook: 'b', fromNote: 'n-9' }])
  })
})

describe('isBrokenLink', () => {
  const known = { bookSlugs: new Set(['a']), noteKeys: new Set(['note:a/n-1']) }
  it('detects valid and broken links', () => {
    expect(isBrokenLink({ type: 'book', slug: 'a' }, known)).toBe(false)
    expect(isBrokenLink({ type: 'book', slug: 'zzz' }, known)).toBe(true)
    expect(isBrokenLink({ type: 'note', slug: 'a', noteId: 'n-1' }, known)).toBe(false)
    expect(isBrokenLink({ type: 'note', slug: 'a', noteId: 'n-9' }, known)).toBe(true)
  })
})
