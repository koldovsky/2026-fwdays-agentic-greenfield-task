import { describe, expect, it } from 'vitest'
import { Locator as RWLocator, LocatorLocations as RWLocations } from '@readium/shared'
import type { Locator } from '@/core/model'
import { publicationSourceFromFile } from '@/platform/web'
import { cfiToLocator, domRangeToLocator, locatorToCfi, locatorToDomRange } from './cfi-locator'
import { EpubFormatHandler } from './index'
import { EMINENCE, PENSEES, fixtureFile } from './test-fixtures'

const HREF = 'OEBPS/Text/chapter.xhtml'

async function firstCfiFromFixture(name: string): Promise<{ cfi: string; href: string }> {
  const pub = await new EpubFormatHandler().open(publicationSourceFromFile(fixtureFile(name)))
  const first = pub.readingOrder[0]
  const cfi = first?.locations?.cfi
  if (typeof cfi !== 'string' || typeof first?.href !== 'string') {
    throw new Error(`fixture ${name} produced no spine CFI`)
  }
  return { cfi, href: first.href }
}

describe('cfiToLocator / locatorToCfi round-trip', () => {
  it('round-trips a CFI taken from the large light-novel EPUB (identity + epub+zip type)', async () => {
    const { cfi, href } = await firstCfiFromFixture(EMINENCE)
    const locator = cfiToLocator(cfi, href)
    expect(locator.locations?.cfi).toBe(cfi)
    expect(locator.type).toBe('application/epub+zip')
    expect(locator.href).toBe(href)
    expect(locatorToCfi(locator)).toBe(cfi)
  })

  it('round-trips a CFI taken from the Pensées EPUB (identity)', async () => {
    const { cfi, href } = await firstCfiFromFixture(PENSEES)
    expect(locatorToCfi(cfiToLocator(cfi, href))).toBe(cfi)
  })

  it('carries positional extras through into the neutral locations', () => {
    const locator = cfiToLocator('epubcfi(/6/4!/4/2/2:0)', HREF, {
      title: 'Chapter 2',
      progression: 0.25,
      totalProgression: 0.1,
      position: 3,
    })
    expect(locator.title).toBe('Chapter 2')
    expect(locator.locations).toMatchObject({
      cfi: 'epubcfi(/6/4!/4/2/2:0)',
      progression: 0.25,
      totalProgression: 0.1,
      position: 3,
    })
  })
})

describe('emitted Locator is plain and serializable', () => {
  const locator = cfiToLocator('epubcfi(/6/4!/4/2/2:0)', HREF, { progression: 0.5 })

  it('survives structuredClone and JSON unchanged', () => {
    expect(structuredClone(locator)).toEqual(locator)
    expect(JSON.parse(JSON.stringify(locator))).toEqual(locator)
  })

  it('is a plain object, not a @readium/shared class instance', () => {
    expect(locator).not.toBeInstanceOf(RWLocator)
    expect(locator.locations).not.toBeInstanceOf(RWLocations)
    expect(Object.getPrototypeOf(locator)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(locator.locations)).toBe(Object.prototype)
  })
})

describe('DOM Range ↔ Locator round-trip (jsdom)', () => {
  it('a Range → Locator → Range resolves to the same selection', async () => {
    const xhtml =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>' +
      '<p>Hello wonderful world</p><p>A second paragraph</p></body></html>'
    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml')
    const paragraph = doc.querySelector('p')
    const textNode = paragraph?.firstChild
    if (!textNode) throw new Error('no text node in parsed doc')

    const range = doc.createRange()
    range.setStart(textNode, 6) // "wonderful world"
    range.setEnd(textNode, 15) // "wonderful"
    expect(range.toString()).toBe('wonderful')

    const locator: Locator = await domRangeToLocator(range, HREF)
    expect(locator.locations?.cfi).toMatch(/^epubcfi\(/)

    const resolved = await locatorToDomRange(locator, doc)
    if (!resolved) throw new Error('locatorToDomRange returned undefined')
    expect(resolved.toString()).toBe('wonderful')
    expect(resolved.startContainer).toBe(range.startContainer)
    expect(resolved.startOffset).toBe(range.startOffset)
    expect(resolved.endContainer).toBe(range.endContainer)
    expect(resolved.endOffset).toBe(range.endOffset)
  })

  it('returns undefined for a Locator without a CFI', async () => {
    const doc = new DOMParser().parseFromString('<p>x</p>', 'text/html')
    expect(
      await locatorToDomRange({ href: HREF, type: 'application/epub+zip' }, doc),
    ).toBeUndefined()
  })
})
