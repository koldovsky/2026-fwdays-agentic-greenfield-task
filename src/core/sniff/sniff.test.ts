import { describe, expect, it } from 'vitest'
import { sniff, sniffMagic } from '@/core/sniff'

describe('sniffMagic', () => {
  it('detects PDF from "%PDF"', () => {
    expect(sniffMagic(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('application/pdf')
  })

  it('detects an EPUB/CBZ ZIP container', () => {
    expect(sniffMagic(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe('application/epub+zip')
  })

  it('returns undefined for unrecognised bytes', () => {
    expect(sniffMagic(new Uint8Array([0x00, 0x01, 0x02]))).toBeUndefined()
  })
})

describe('sniff — source-priority detection (DESIGN §7)', () => {
  it('a declared media type is the highest-confidence signal (1.0)', () => {
    expect(sniff({ mediaType: 'application/pdf' })).toEqual({
      mediaType: 'application/pdf',
      confidence: 1,
    })
  })

  it('maps a bare extension to a media type at a lower confidence (0.7)', () => {
    expect(sniff({ extension: 'pdf' })).toEqual({ mediaType: 'application/pdf', confidence: 0.7 })
    expect(sniff({ extension: '.EPUB' })).toEqual({
      mediaType: 'application/epub+zip',
      confidence: 0.7,
    })
    expect(sniff({ extension: 'cbz' })).toEqual({
      mediaType: 'application/vnd.comicbook+zip',
      confidence: 0.7,
    })
  })

  it('falls back to magic bytes at the lowest confidence (0.5)', () => {
    expect(sniff({ headBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) })).toEqual({
      mediaType: 'application/pdf',
      confidence: 0.5,
    })
  })

  it('prefers a declared media type over a misleading extension', () => {
    // Connector metadata says PDF; the resource carries a misleading `.bin` extension.
    expect(sniff({ mediaType: 'application/pdf', extension: 'bin' })).toEqual({
      mediaType: 'application/pdf',
      confidence: 1,
    })
  })

  it('returns no media type when nothing is recognised', () => {
    expect(sniff({})).toEqual({ mediaType: undefined, confidence: 0 })
    expect(sniff({ extension: 'xyz' })).toEqual({ mediaType: undefined, confidence: 0 })
    expect(sniff({ headBytes: new Uint8Array([0, 1, 2, 3]) })).toEqual({
      mediaType: undefined,
      confidence: 0,
    })
  })
})
