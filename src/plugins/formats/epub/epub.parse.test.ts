import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isReactive, reactive } from 'vue'
import { publicationSourceFromBytes } from '@/core/contracts'
import { publicationSourceFromFile } from '@/platform/web'
import { EPUB_CAPABILITIES, EPUB_FORMAT_ID, EpubFormatHandler } from './index'
import { EMINENCE, PENSEES, fixtureBytes, fixtureFile } from './test-fixtures'

describe('EPUB capabilities & id', () => {
  it('declares the EPUB renderer capabilities exactly', () => {
    expect(EPUB_CAPABILITIES).toEqual({
      mediaTypes: ['application/epub+zip'],
      extensions: ['epub'],
      layout: 'reflowable',
      search: true,
      tts: true,
      locatorScheme: 'cfi',
    })
  })

  it('exposes a stable id and the EPUB media type', () => {
    const handler = new EpubFormatHandler()
    expect(handler.id).toBe(EPUB_FORMAT_ID)
    expect(handler.id).toBe('format.epub')
    expect(handler.mediaTypes).toContain('application/epub+zip')
    expect(handler.capabilities).toBe(EPUB_CAPABILITIES)
  })
})

describe('sniff', () => {
  const handler = new EpubFormatHandler()

  it('claims EPUB by media type, extension, or ZIP head bytes', () => {
    expect(handler.sniff({ mediaType: 'application/epub+zip' })).toBe(1)
    expect(handler.sniff({ extension: 'epub' })).toBeGreaterThan(0)
    expect(handler.sniff({ extension: '.EPUB' })).toBeGreaterThan(0)
    expect(handler.sniff({ headBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) })).toBeGreaterThan(
      0,
    )
  })

  it('does not claim non-EPUB input', () => {
    expect(handler.sniff({ headBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) })).toBe(0) // %PDF
    expect(handler.sniff({ mediaType: 'application/pdf' })).toBe(0)
    expect(handler.sniff({ extension: 'pdf' })).toBe(0)
    expect(handler.sniff({})).toBe(0)
  })
})

describe('open → Readium-aligned Publication', () => {
  it('parses the large light-novel EPUB (via open(publicationSourceFromBytes))', async () => {
    const pub = await new EpubFormatHandler().open(
      publicationSourceFromBytes(fixtureBytes(EMINENCE)),
    )
    expect(pub.metadata.title).toBe('The Eminence in Shadow, Vol. 1')
    expect(pub.metadata.author).toBe('Daisuke Aizawa and Touzai')
    expect(pub.metadata.language).toBe('en')
    expect(pub.layout).toBe('reflowable')
    expect(pub.readingOrder.length).toBeGreaterThanOrEqual(20)
    expect(pub.readingOrder[0]?.locations?.position).toBe(1)
    expect(pub.tableOfContents?.length ?? 0).toBeGreaterThan(0)
  })

  it('parses the small Pensées EPUB (via open(publicationSourceFromFile))', async () => {
    const pub = await new EpubFormatHandler().open(publicationSourceFromFile(fixtureFile(PENSEES)))
    expect(pub.metadata.title).toBe('Pensées')
    expect(pub.metadata.author).toBe('Blaise Pascal')
    expect(pub.readingOrder.length).toBeGreaterThan(0)
    expect(pub.readingOrder.every((entry) => typeof entry.href === 'string' && entry.href)).toBe(
      true,
    )
    expect(pub.tableOfContents?.length ?? 0).toBeGreaterThan(0)
  })
})

describe('markRaw() boundary — returned objects are plain & non-reactive', () => {
  it('the returned Publication is not a Vue reactive proxy', async () => {
    const pub = await new EpubFormatHandler().open(publicationSourceFromFile(fixtureFile(PENSEES)))
    expect(isReactive(pub)).toBe(false)
    expect(isReactive(reactive({}))).toBe(true) // control: the matcher really detects reactivity
  })
})

describe('framework-neutrality & lazy-engine static checks', () => {
  const HERE = resolve(process.cwd(), 'src/plugins/formats/epub')
  const SOURCES = [
    'index.ts',
    'book-loader.ts',
    'cfi-locator.ts',
    'to-publication.ts',
    'manifest.ts',
  ]
  const read = (file: string) => readFileSync(resolve(HERE, file), 'utf8')

  it('imports no UI framework (Vue) — markRaw is the consumer’s responsibility', () => {
    for (const file of SOURCES) {
      const src = read(file)
      expect(src, `${file} must not import vue`).not.toMatch(/from\s+['"]vue['"]/)
    }
  })

  it('never statically imports the foliate engine (engine reached only via dynamic import())', () => {
    for (const file of SOURCES) {
      for (const line of read(file).split('\n')) {
        // A runtime `... from 'foliate-js…'` is forbidden; only erased `import type` is allowed.
        if (/from\s+['"]foliate-js/.test(line)) {
          expect(line, `${file}: ${line.trim()}`).toMatch(/import\s+type/)
        }
        // A bare side-effect static import of the engine is forbidden.
        expect(line, `${file}: ${line.trim()}`).not.toMatch(/^\s*import\s+['"]foliate-js/)
      }
    }
  })
})
