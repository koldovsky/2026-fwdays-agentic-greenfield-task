// Gate-2 INDEPENDENT verifier: DOM-free conformance for `harden-format-navigator-contract`.
// Written by the checker — completely independent from the maker's navigator-contract.test.ts.
// Scope: neutral `Navigator`/`FormatHandler`/`PublicationSource`/`NavigatorOptions` carry zero DOM/web
// types; `HTMLElement` appears exclusively under `platform/web`; the file scan approach here uses
// token-set comparisons (not the maker's substring-in-loop pattern) to serve as a true second opinion.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  Navigator,
  FormatHandler,
  PublicationSource,
  NavigatorOptions,
} from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'
import type { Locator, ReadingPreferences } from '@/core/model'

const ROOT = process.cwd()

// Strip JS/TS comments so architecture notes ("no DOM, no fetch...") don't false-match the DOM scan.
// Block comments (slash-star ... star-slash) are removed first, then line comments (slash-slash ...).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function codeTokens(relPath: string): Set<string> {
  const raw = readFileSync(resolve(ROOT, relPath), 'utf8')
  const code = stripComments(raw)
  return new Set(code.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? [])
}

// --- (a) DOM-free token scan (approach independent of the maker's substring tests) ----------------
// Scan ONLY the non-comment portion of the file so architecture comments ("no DOM, no fetch…")
// don't false-match.

const DOM_CODE_IDENTIFIERS = new Set([
  'HTMLElement',
  'HTMLDivElement',
  'ShadowRoot',
  'localStorage',
  'sessionStorage',
  'EventTarget',
])

describe('(a) core/contracts — DOM/web-free (independent code-token scan, comments stripped)', () => {
  it('no DOM code-level identifier appears in core/contracts/index.ts', () => {
    const tokens = codeTokens('src/core/contracts/index.ts')
    const hits: string[] = []
    for (const id of DOM_CODE_IDENTIFIERS) {
      if (tokens.has(id)) hits.push(id)
    }
    expect(hits, `DOM tokens found in core/contracts code: ${hits.join(', ')}`).toHaveLength(0)
  })

  it('no DOM code-level identifier appears in core/model/index.ts', () => {
    const tokens = codeTokens('src/core/model/index.ts')
    const hits: string[] = []
    for (const id of DOM_CODE_IDENTIFIERS) {
      if (tokens.has(id)) hits.push(id)
    }
    expect(hits, `DOM tokens found in core/model code: ${hits.join(', ')}`).toHaveLength(0)
  })

  it('HTMLElement does NOT appear in core/contracts/index.ts (comments or code)', () => {
    const content = readFileSync(resolve(ROOT, 'src/core/contracts/index.ts'), 'utf8')
    expect(content).not.toContain('HTMLElement')
  })

  it('HTMLElement does NOT appear in core/model/index.ts (comments or code)', () => {
    const content = readFileSync(resolve(ROOT, 'src/core/model/index.ts'), 'utf8')
    expect(content).not.toContain('HTMLElement')
  })

  it('HTMLElement appears in platform/web/web-format-handler.ts (the ONE allowed location)', () => {
    const content = readFileSync(resolve(ROOT, 'src/platform/web/web-format-handler.ts'), 'utf8')
    expect(content).toContain('HTMLElement')
  })

  it('HTMLElement is NOT a code-level type in platform/web/index.ts (comment-reference is OK)', () => {
    // index.ts may reference HTMLElement in a comment explaining what it re-exports, but must
    // NOT declare it in actual TypeScript types — that would widen the web type surface.
    const tokens = codeTokens('src/platform/web/index.ts')
    expect(
      tokens.has('HTMLElement'),
      'HTMLElement must not appear as a code token in platform/web/index.ts',
    ).toBe(false)
  })

  it('the old `parse(` method is gone from core/contracts (no-space form — prose `parse (…)` is OK)', () => {
    const content = readFileSync(resolve(ROOT, 'src/core/contracts/index.ts'), 'utf8')
    // `\bparse\(` with NO intervening space: matches method/call `parse(` but not prose "parse (text)".
    expect(content).not.toMatch(/\bparse\(/)
  })

  it('the old `currentLocation()` is gone from core/contracts', () => {
    const content = readFileSync(resolve(ROOT, 'src/core/contracts/index.ts'), 'utf8')
    expect(content).not.toContain('currentLocation')
  })
})

// --- Structural TypeScript conformance: the types compile as a native-client conformance target ----

describe('(a-ts) Navigator / FormatHandler / NavigatorOptions are structurally DOM-free', () => {
  it('a plain-object Navigator with no DOM member satisfies the interface', () => {
    const locator: Locator = { href: 'part1.xhtml', type: 'application/epub+zip' }
    const prefs: ReadingPreferences = { theme: 'dark', layout: 'paged' }

    // Every method here is DOM-free — if HTMLElement crept into Navigator, this would fail to compile
    const nav: Navigator = {
      goTo: async (_l: Locator) => {},
      next: async () => {},
      prev: async () => {},
      seek: async (_f: number) => {},
      currentLocator: () => locator,
      applyPreferences: (_p: ReadingPreferences) => {},
      on: (_event: 'locatorChanged' | 'error', _cb: (v: never) => void) => () => {},
      destroy: () => {},
    }
    expect(nav.currentLocator().href).toBe('part1.xhtml')
    nav.applyPreferences(prefs)
  })

  it('a plain-object FormatHandler with no DOM member satisfies the interface', () => {
    const source: PublicationSource = publicationSourceFromBytes(new Uint8Array([0xef]))
    const opts: NavigatorOptions = { source, preferences: { theme: 'light' } }

    const fh: FormatHandler = {
      id: 'verifier-noop',
      mediaTypes: ['application/epub+zip'],
      capabilities: { mediaTypes: ['application/epub+zip'] },
      sniff: (input) => (input.mediaType === 'application/epub+zip' ? 1 : 0),
      open: async (_src) => ({ metadata: { title: 'x' }, readingOrder: [] }),
    }

    expect(fh.sniff({ mediaType: 'application/epub+zip' })).toBe(1)
    expect(opts.source).toBe(source)
    expect(opts.preferences?.theme).toBe('light')
  })
})

// --- publicationSourceFromBytes: read() returns byteOffset-0 fresh copies --------------------

describe('publicationSourceFromBytes isolation (independent read-contract checks)', () => {
  it('size() matches the backing array length', async () => {
    const arr = new Uint8Array(512)
    const src = publicationSourceFromBytes(arr)
    expect(await src.size()).toBe(512)
  })

  it('read() returns a fresh Uint8Array at byteOffset 0 (not a shared view)', async () => {
    const arr = new Uint8Array([10, 20, 30, 40, 50, 60])
    const src = publicationSourceFromBytes(arr)
    const chunk = await src.read(1, 4)

    expect(chunk.byteOffset).toBe(0)
    expect(chunk.buffer).not.toBe(arr.buffer) // independent memory
    expect(Array.from(chunk)).toEqual([20, 30, 40, 50])
  })

  it('mutating the original after read() does NOT corrupt the returned chunk', async () => {
    const arr = new Uint8Array([1, 2, 3, 4, 5])
    const src = publicationSourceFromBytes(arr)
    const chunk = await src.read(0, 3)

    // Corrupt the original backing array
    arr[0] = 0xff
    arr[1] = 0xff
    arr[2] = 0xff

    // The previously returned chunk must be unchanged
    expect(Array.from(chunk)).toEqual([1, 2, 3])
  })

  it('a subarray-backed source (non-zero byteOffset) still returns byteOffset-0 reads', async () => {
    // Simulate the scenario where caller passes a subarray view — zip.js reads the returned
    // Uint8Array via `new DataView(result.buffer)` which assumes byteOffset-0.
    const full = new Uint8Array([0, 10, 20, 30, 40, 50])
    const view = full.subarray(2) // byteOffset == 2, shares full.buffer
    expect(view.byteOffset).toBe(2)

    const src = publicationSourceFromBytes(view)
    const chunk = await src.read(0, 3)

    expect(chunk.byteOffset).toBe(0)
    expect(chunk.buffer).not.toBe(full.buffer) // completely independent
    expect(Array.from(chunk)).toEqual([20, 30, 40])
  })
})
