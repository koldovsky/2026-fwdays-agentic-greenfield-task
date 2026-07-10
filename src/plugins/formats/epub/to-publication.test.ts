import { describe, expect, it } from 'vitest'
import type { EPUB } from 'foliate-js/epub.js'
import {
  flattenToc,
  normalizeContributor,
  normalizeLanguage,
  normalizeText,
  toPublication,
} from './to-publication'

describe('metadata normalizers', () => {
  it('normalizeText flattens strings and language maps', () => {
    expect(normalizeText('Pensées')).toBe('Pensées')
    expect(normalizeText('  trimmed  ')).toBe('trimmed')
    expect(normalizeText({ en: 'Title', fr: 'Titre' })).toBe('Title')
    expect(normalizeText('')).toBeUndefined()
    expect(normalizeText(undefined)).toBeUndefined()
    expect(normalizeText(null)).toBeUndefined()
  })

  it('normalizeContributor flattens string / object / array shapes', () => {
    expect(normalizeContributor('Blaise Pascal')).toBe('Blaise Pascal')
    expect(normalizeContributor({ name: 'Daisuke Aizawa' })).toBe('Daisuke Aizawa')
    expect(normalizeContributor({ name: { en: 'Author One' } })).toBe('Author One')
    expect(normalizeContributor(['A', { name: 'B' }])).toBe('A, B')
    expect(normalizeContributor([])).toBeUndefined()
    expect(normalizeContributor(undefined)).toBeUndefined()
  })

  it('normalizeLanguage picks the first tag', () => {
    expect(normalizeLanguage(['en', 'fr'])).toBe('en')
    expect(normalizeLanguage('ja')).toBe('ja')
    expect(normalizeLanguage([])).toBeUndefined()
  })
})

describe('flattenToc', () => {
  it('flattens the tree depth-first and keeps only entries with an href', () => {
    const toc = flattenToc([
      { label: 'Part One', href: 'part1.xhtml', subitems: [{ label: 'Ch 1', href: 'ch1.xhtml' }] },
      { label: 'Heading only', href: null, subitems: [{ label: 'Ch 2', href: 'ch2.xhtml' }] },
    ])
    expect(toc.map((t) => t.href)).toEqual(['part1.xhtml', 'ch1.xhtml', 'ch2.xhtml'])
    expect(toc[0]?.title).toBe('Part One')
    expect(toc.every((t) => t.type === 'application/epub+zip')).toBe(true)
  })

  it('returns an empty array for a missing TOC', () => {
    expect(flattenToc(null)).toEqual([])
    expect(flattenToc(undefined)).toEqual([])
  })
})

describe('toPublication', () => {
  const fakeBook = (overrides: Partial<EPUB>): EPUB =>
    ({
      metadata: {},
      sections: [],
      toc: null,
      rendition: {},
      ...overrides,
    }) as unknown as EPUB

  it('maps metadata, spine positions/CFIs and layout', () => {
    const pub = toPublication(
      fakeBook({
        metadata: { title: { en: 'A Title' }, author: ['Ann', { name: 'Bob' }], language: ['en'] },
        sections: [
          { id: 'a.xhtml', cfi: 'epubcfi(/6/2)' },
          { id: 'b.xhtml' },
        ] as unknown as EPUB['sections'],
        rendition: { layout: 'pre-paginated' },
      }),
    )
    expect(pub.metadata).toEqual({ title: 'A Title', author: 'Ann, Bob', language: 'en' })
    expect(pub.layout).toBe('fixed')
    expect(pub.readingOrder).toEqual([
      {
        href: 'a.xhtml',
        type: 'application/epub+zip',
        locations: { position: 1, cfi: 'epubcfi(/6/2)' },
      },
      { href: 'b.xhtml', type: 'application/epub+zip', locations: { position: 2 } },
    ])
  })

  it('defaults a missing title and omits empty optionals', () => {
    const pub = toPublication(fakeBook({}))
    expect(pub.metadata).toEqual({ title: 'Untitled' })
    expect(pub.layout).toBe('reflowable')
    expect(pub.readingOrder).toEqual([])
    expect(pub.tableOfContents).toBeUndefined()
  })
})
