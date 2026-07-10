import { describe, expect, it } from 'vitest'
import { shouldBypassSW } from './sw-bypass'

const ORIGIN = 'https://edda.test'

describe('shouldBypassSW (ADR-005: book bytes bypass the SW)', () => {
  it('handles a same-origin GET for a shell asset', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/assets/index.js`), ORIGIN)).toBe(false)
  })

  it('handles a same-origin navigation request (shell route)', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/library`), ORIGIN)).toBe(false)
  })

  it('bypasses byte-range (206) book reads', () => {
    const ranged = new Request(`${ORIGIN}/book/abc.epub`, { headers: { Range: 'bytes=0-1023' } })
    expect(shouldBypassSW(ranged, ORIGIN)).toBe(true)
  })

  it('bypasses non-GET requests', () => {
    expect(shouldBypassSW(new Request(`${ORIGIN}/api`, { method: 'POST' }), ORIGIN)).toBe(true)
  })

  it('bypasses cross-origin requests (remote server bytes/API)', () => {
    expect(shouldBypassSW(new Request('https://komga.example.net/book/1'), ORIGIN)).toBe(true)
  })
})
