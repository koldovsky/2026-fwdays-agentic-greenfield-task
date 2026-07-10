import { describe, expect, it } from 'vitest'
import type { PluginManifest } from '@/core/contracts'
import { EPUB_MANIFEST } from '@/plugins/formats/epub/manifest'
import { PDF_MANIFEST } from '@/plugins/formats/pdf/manifest'
import { KOMGA_MANIFEST, OPDS_MANIFEST } from '@/app/plugins-catalog'
import {
  advisoryNote,
  displayVersion,
  extensionChips,
  formatPluginSize,
} from '@/app/extensions-presentation'

describe('extensionChips — maket-faithful capability chips', () => {
  it('derives the bundled connector/format chips from their honest capabilities', () => {
    expect(extensionChips(OPDS_MANIFEST)).toEqual(['OPDS 1/2', 'Always-on fallback'])
    expect(extensionChips(KOMGA_MANIFEST)).toEqual([
      'Search',
      'Progress sync',
      'Page streaming',
      'Thumbnails',
    ])
    expect(extensionChips(EPUB_MANIFEST)).toEqual(['Reflowable', 'Search', 'TTS', 'CFI locators'])
  })

  it('derives the PDF prompt chips (Fixed layout / Search / Text selection)', () => {
    expect(extensionChips(PDF_MANIFEST)).toEqual(['Fixed layout', 'Search', 'Text selection'])
  })
})

describe('formatPluginSize / displayVersion / advisoryNote', () => {
  it('renders KB as the maket "x.y MB" form', () => {
    expect(formatPluginSize(PDF_MANIFEST.approxSizeKB)).toBe('1.2 MB')
    expect(formatPluginSize(614)).toBe('0.6 MB') // rounds to one decimal
    expect(formatPluginSize(2048)).toBe('2.0 MB')
    expect(formatPluginSize(undefined)).toBe('')
  })

  it('normalises a version to the v-label', () => {
    expect(displayVersion('1.4.0')).toBe('v1.4.0')
    expect(displayVersion('v2.1.0')).toBe('v2.1.0')
  })

  it('flags only a connector with no server-side progress as "no progress API"', () => {
    // Built inline: the app no longer catalogues a no-progress vapour connector, but the helper must
    // still flag one (a connector with progressSync:false) and leave formats / progress-syncing
    // connectors unflagged.
    const noProgressConnector: PluginManifest = {
      id: 'connector.example',
      name: 'Example',
      version: '0.0.0',
      kind: 'connector',
      hostApi: '^1.0.0',
      bundled: false,
      capabilities: {
        protocols: ['opds1'],
        auth: ['none'],
        progressSync: false,
        search: false,
        download: true,
        pagedStreaming: false,
        thumbnails: false,
      },
    }
    expect(advisoryNote(noProgressConnector)).toBe('no progress API')
    expect(advisoryNote(KOMGA_MANIFEST)).toBeUndefined() // progressSync: true
    expect(advisoryNote(PDF_MANIFEST)).toBeUndefined() // a format never shows the connector advisory
  })
})
