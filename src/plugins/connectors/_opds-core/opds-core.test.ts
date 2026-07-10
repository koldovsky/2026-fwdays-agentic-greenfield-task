import { describe, expect, it } from 'vitest'
import { type OpdsLink, parseOpdsEntries, resolveAcquisitionLink } from '.'

describe('resolveAcquisitionLink', () => {
  const links: OpdsLink[] = [
    { href: '/cover.jpg', rel: 'http://opds-spec.org/image', type: 'image/jpeg' },
    { href: '/book.epub', rel: 'http://opds-spec.org/acquisition', type: 'application/epub+zip' },
    {
      href: '/book.pdf',
      rel: ['http://opds-spec.org/acquisition/open-access'],
      type: 'application/pdf',
    },
  ]

  it('prefers an acquisition link, optionally constrained to a media type', () => {
    expect(resolveAcquisitionLink(links)?.href).toBe('/book.epub')
    expect(resolveAcquisitionLink(links, { type: 'application/pdf' })?.href).toBe('/book.pdf')
  })

  it('falls back to any acquisition link when the type does not match', () => {
    expect(resolveAcquisitionLink(links, { type: 'application/x-cbz' })?.href).toBe('/book.epub')
  })

  it('returns undefined when there is no acquisition or type match', () => {
    expect(resolveAcquisitionLink([{ href: '/self', rel: 'self' }])).toBeUndefined()
  })
})

describe('parseOpdsEntries', () => {
  const feed = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Pensées</title>
        <id>urn:book:1</id>
        <link rel="http://opds-spec.org/image" type="image/jpeg" href="/c.jpg"/>
        <link rel="http://opds-spec.org/acquisition" type="application/epub+zip" href="/p.epub"/>
      </entry>
      <entry>
        <title>No acquisition</title>
        <id>urn:book:2</id>
        <link rel="self" href="/self"/>
      </entry>
    </feed>`

  it('parses entries with an acquisition link into BookRefs and skips those without', () => {
    const refs = parseOpdsEntries(feed, 'connector-komga')
    expect(refs).toHaveLength(1)
    expect(refs[0]).toEqual({
      sourceId: 'connector-komga',
      bookId: 'urn:book:1',
      mediaType: 'application/epub+zip',
      title: 'Pensées',
    })
  })

  it('returns an empty list for malformed XML', () => {
    expect(parseOpdsEntries('<not-a-feed', 'connector-komga')).toEqual([])
  })
})
