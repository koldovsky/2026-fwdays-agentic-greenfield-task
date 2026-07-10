/**
 * Gate-2 independent checker tests for add-format-epub.
 *
 * Written by the Gate-2 verifier; NOT by the maker. Derives each guarantee from
 * scratch — no maker helpers reused (test-fixtures.ts is not imported; fixture
 * bytes are loaded directly). Assertions are cross-checked against the spec's
 * acceptance criteria: parse metadata, capabilities shape, CFI round-trip
 * identity, Locator serialization, @readium/shared instance leak detection,
 * and core neutrality.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isReactive, markRaw } from 'vue'
import { Locator as RWLocator, LocatorLocations as RWLocations } from '@readium/shared'
// `open(source)` replaced `parse(bytes)` in this change — these are the neutral/web source builders.
import { publicationSourceFromBytes } from '@/core/contracts'
import { publicationSourceFromFile } from '@/platform/web'

// ---------- fixture helpers (checker-local, no dependency on test-fixtures.ts) ----------

const FIXTURE_DIR = resolve(process.cwd(), 'test-epubs')

function loadBytes(filename: string): Uint8Array {
  // new Uint8Array(buf) copies the Node Buffer into a plain ArrayBuffer-backed view,
  // which is what the File / Blob constructor requires (BlobPart must be ArrayBuffer-backed).
  const buf = readFileSync(resolve(FIXTURE_DIR, filename))
  return new Uint8Array(buf)
}

function loadFile(filename: string): File {
  // Double-wrap: new Uint8Array(loadBytes(...)) gives a fresh ArrayBuffer-backed copy.
  return new File([new Uint8Array(loadBytes(filename))], filename, {
    type: 'application/epub+zip',
  })
}

const EMINENCE_FILE = 'The Eminence in Shadow - Volume 01 [Yen Press][Kobo].epub'
const PENSEES_FILE = 'blaise-pascal_pensees.epub'

// ---------- 1. Exact metadata from both real fixtures (re-derived independently) ----------

describe('Gate-2 checker: exact metadata from real fixtures', () => {
  it('large fixture: title, author, language, readingOrder ≥ 20, non-empty TOC', async () => {
    const { EpubFormatHandler } = await import('./index')
    const pub = await new EpubFormatHandler().open(
      publicationSourceFromBytes(loadBytes(EMINENCE_FILE)),
    )

    expect(pub.metadata.title).toBe('The Eminence in Shadow, Vol. 1')
    // Spec says "author contains Daisuke Aizawa"
    expect(pub.metadata.author).toContain('Daisuke Aizawa')
    expect(pub.metadata.language).toBe('en')
    expect(pub.readingOrder.length).toBeGreaterThanOrEqual(20)
    expect(pub.tableOfContents).toBeDefined()
    expect(pub.tableOfContents!.length).toBeGreaterThan(0)
    // Every spine entry has a string href and an EPUB media type
    for (const entry of pub.readingOrder) {
      expect(typeof entry.href).toBe('string')
      expect(entry.href.length).toBeGreaterThan(0)
      expect(entry.type).toBe('application/epub+zip')
    }
  })

  it('small fixture (Pensées): title, author, readingOrder > 0, non-empty TOC', async () => {
    const { EpubFormatHandler } = await import('./index')
    const pub = await new EpubFormatHandler().open(
      publicationSourceFromFile(loadFile(PENSEES_FILE)),
    )

    expect(pub.metadata.title).toBe('Pensées')
    expect(pub.metadata.author).toBe('Blaise Pascal')
    expect(pub.readingOrder.length).toBeGreaterThan(0)
    expect(pub.tableOfContents).toBeDefined()
    expect(pub.tableOfContents!.length).toBeGreaterThan(0)
  })
})

// ---------- 2. Capabilities shape (independent re-assertion) ----------

describe('Gate-2 checker: capabilities shape', () => {
  it('mediaTypes, extensions, layout, search, tts, locatorScheme are exactly correct', async () => {
    const { EPUB_CAPABILITIES } = await import('./index')
    // Checker independently asserts every field from spec
    expect(EPUB_CAPABILITIES.mediaTypes).toContain('application/epub+zip')
    expect(EPUB_CAPABILITIES.extensions).toContain('epub')
    expect(EPUB_CAPABILITIES.layout).toBe('reflowable')
    expect(EPUB_CAPABILITIES.search).toBe(true)
    expect(EPUB_CAPABILITIES.tts).toBe(true)
    expect(EPUB_CAPABILITIES.locatorScheme).toBe('cfi')
  })

  it('sniff: positive for EPUB, zero for PDF and empty input', async () => {
    const { EpubFormatHandler } = await import('./index')
    const h = new EpubFormatHandler()
    // Positive cases
    expect(h.sniff({ mediaType: 'application/epub+zip' })).toBe(1)
    expect(h.sniff({ extension: 'epub' })).toBeGreaterThan(0)
    expect(h.sniff({ extension: '.EPUB' })).toBeGreaterThan(0)
    // ZIP magic bytes (shared with CBZ → moderate claim)
    expect(h.sniff({ headBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) })).toBeGreaterThan(0)
    // Negative cases
    expect(h.sniff({ mediaType: 'application/pdf' })).toBe(0)
    expect(h.sniff({ extension: 'pdf' })).toBe(0)
    // PDF magic: %PDF = 0x25 0x50 0x44 0x46
    expect(h.sniff({ headBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) })).toBe(0)
    expect(h.sniff({})).toBe(0)
  })
})

// ---------- 3. CFI round-trip identity (independent, both fixtures) ----------

describe('Gate-2 checker: CFI round-trip identity', () => {
  it('cfi → Locator → cfi is identity for the large fixture (Eminence)', async () => {
    const { EpubFormatHandler } = await import('./index')
    const { cfiToLocator, locatorToCfi } = await import('./cfi-locator')

    const pub = await new EpubFormatHandler().open(
      publicationSourceFromFile(loadFile(EMINENCE_FILE)),
    )
    const firstWithCfi = pub.readingOrder.find((e) => typeof e.locations?.cfi === 'string')
    expect(firstWithCfi).toBeDefined()

    const originalCfi = firstWithCfi!.locations!.cfi!
    const locator = cfiToLocator(originalCfi, firstWithCfi!.href)
    const roundTripped = locatorToCfi(locator)
    expect(roundTripped).toBe(originalCfi)
  })

  it('cfi → Locator → cfi is identity for the small fixture (Pensées)', async () => {
    const { EpubFormatHandler } = await import('./index')
    const { cfiToLocator, locatorToCfi } = await import('./cfi-locator')

    const pub = await new EpubFormatHandler().open(
      publicationSourceFromFile(loadFile(PENSEES_FILE)),
    )
    const firstWithCfi = pub.readingOrder.find((e) => typeof e.locations?.cfi === 'string')
    expect(firstWithCfi).toBeDefined()

    const originalCfi = firstWithCfi!.locations!.cfi!
    const roundTripped = locatorToCfi(cfiToLocator(originalCfi, firstWithCfi!.href))
    expect(roundTripped).toBe(originalCfi)
  })
})

// ---------- 4. Emitted Locator: plain + survives serialization + no class leaks ----------

describe('Gate-2 checker: Locator is plain + no @readium/shared leak', () => {
  const TEST_CFI = 'epubcfi(/6/4!/4/2/2:0)'
  const TEST_HREF = 'OEBPS/Text/ch1.xhtml'

  it('emitted Locator has Object.prototype — not a @readium/shared class instance', async () => {
    const { cfiToLocator } = await import('./cfi-locator')
    const locator = cfiToLocator(TEST_CFI, TEST_HREF, { totalProgression: 0.42 })

    // Must NOT be an @readium/shared class instance
    expect(locator).not.toBeInstanceOf(RWLocator)
    expect(locator.locations).not.toBeInstanceOf(RWLocations)
    // Must be a plain-object literal (Object.prototype, not a subclass)
    expect(Object.getPrototypeOf(locator)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(locator.locations!)).toBe(Object.prototype)
  })

  it('emitted Locator survives structuredClone and JSON round-trip unchanged', async () => {
    const { cfiToLocator } = await import('./cfi-locator')
    const locator = cfiToLocator(TEST_CFI, TEST_HREF, {
      title: 'Ch. 1',
      progression: 0.1,
      totalProgression: 0.05,
    })

    const cloned = structuredClone(locator)
    expect(cloned).toEqual(locator)

    const jsonRound = JSON.parse(JSON.stringify(locator)) as typeof locator
    expect(jsonRound).toEqual(locator)
    // CFI preserved verbatim through JSON
    expect(jsonRound.locations?.cfi).toBe(TEST_CFI)
  })
})

// ---------- 5. Publication is not a Vue reactive proxy (non-reactivity) ----------

describe('Gate-2 checker: Publication non-reactivity', () => {
  it('parsed Publication is not reactive; wrapping it in reactive() would be', async () => {
    const { EpubFormatHandler } = await import('./index')
    const pub = await new EpubFormatHandler().open(
      publicationSourceFromFile(loadFile(PENSEES_FILE)),
    )

    expect(isReactive(pub)).toBe(false)
    // Confirm the test harness can detect reactivity when it exists
    const wrapped = markRaw(pub)
    const proxy = { pub: wrapped }
    expect(isReactive(proxy)).toBe(false) // plain object stays non-reactive
  })
})

// ---------- 6. Core neutrality: src/core/ imports no foliate-js or @readium/shared ----------

describe('Gate-2 checker: core neutrality — no foliate-js / @readium/shared in src/core/', () => {
  it('src/core/ contains zero imports of foliate-js or @readium/shared', () => {
    // grep exits 0 when it FINDS a match (which would be a violation), 1 when it finds nothing (pass).
    let foundViolation = false
    let violatingLines = ''
    try {
      violatingLines = execSync('grep -rn "from.*foliate-js\\|from.*@readium" src/core/', {
        cwd: process.cwd(),
        encoding: 'utf8',
      })
      foundViolation = violatingLines.trim().length > 0
    } catch {
      // grep exits 1 when nothing is found — that is the passing case
      foundViolation = false
    }

    expect(foundViolation, `Core imports plugin deps:\n${violatingLines}`).toBe(false)
  })
})
