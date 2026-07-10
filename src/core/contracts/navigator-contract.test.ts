// Conformance (task 5.1): the neutral Format/Navigator contract is the future native client's shared
// target, so it must carry NO DOM/web type. This pins the load-bearing rule structurally:
//  - `core/contracts` (and `core/model`, the `ReadingPreferences` home) reference no DOM/web type;
//  - the removed `parse(bytes)` / `currentLocation()` names are gone;
//  - `HTMLElement` appears in the WHOLE contract surface ONLY on `platform/web`'s `createNavigator` mount.
// It also exercises the neutral helper + checks the enriched shapes compile as a conformance target.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  FormatHandler,
  Navigator,
  NavigatorOptions,
  PublicationSource,
} from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'
import type { Locator, ReadingPreferences } from '@/core/model'

const ROOT = process.cwd()
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8')

const CONTRACTS = read('src/core/contracts/index.ts')
const MODEL = read('src/core/model/index.ts')
const WEB_HANDLER = read('src/platform/web/web-format-handler.ts')

// DOM/web identifiers that must never appear in a neutral core module. Substrings unlikely to false-match.
const FORBIDDEN_DOM_WEB = [
  'HTMLElement',
  'HTMLDivElement',
  'Document',
  'ShadowRoot',
  'window.',
  'document.',
  'localStorage',
  'ReadableStream',
  'fetch(',
]

describe('core/contracts is DOM/network-free (conformance)', () => {
  it('declares none of the DOM/web identifiers', () => {
    for (const token of FORBIDDEN_DOM_WEB) {
      expect(CONTRACTS, `core/contracts must not reference ${token}`).not.toContain(token)
    }
  })

  it('no longer declares the removed members (`parse`, `currentLocation`)', () => {
    // A method/call is `parse(` with no space (prose like "an EPUB parse (…)" is fine).
    expect(CONTRACTS).not.toMatch(/\bparse\(/)
    expect(CONTRACTS).not.toContain('currentLocation')
  })

  it('declares the enriched neutral surface', () => {
    for (const token of [
      'PublicationSource',
      'NavigatorOptions',
      'SniffInput',
      'Unsubscribe',
      'currentLocator',
      'publicationSourceFromBytes',
    ]) {
      expect(CONTRACTS, `core/contracts should declare ${token}`).toContain(token)
    }
  })
})

describe('core/model (ReadingPreferences home) is DOM/network-free', () => {
  it('declares none of the DOM/web identifiers', () => {
    for (const token of FORBIDDEN_DOM_WEB) {
      expect(MODEL, `core/model must not reference ${token}`).not.toContain(token)
    }
    expect(MODEL).toContain('ReadingPreferences')
  })
})

describe('HTMLElement is isolated to the platform/web factory', () => {
  it('appears in web-format-handler.ts exactly once — the createNavigator mount', () => {
    const occurrences = WEB_HANDLER.split('HTMLElement').length - 1
    expect(occurrences).toBe(1)
    expect(WEB_HANDLER).toMatch(/createNavigator\([^)]*mount:\s*HTMLElement/s)
  })
})

describe('publicationSourceFromBytes — neutral random-access source', () => {
  it('reports size and reads bounded ranges as fresh byteOffset-0 copies', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40, 50])
    const source: PublicationSource = publicationSourceFromBytes(bytes)
    expect(await source.size()).toBe(5)

    const slice = await source.read(1, 3)
    expect(Array.from(slice)).toEqual([20, 30, 40])
    // A fresh copy (byteOffset 0), not a view into the input buffer — zip readers assume this.
    expect(slice.byteOffset).toBe(0)
    expect(slice.buffer).not.toBe(bytes.buffer)
  })
})

describe('the enriched contract is a usable conformance target (compiles)', () => {
  it('a plain object can satisfy the neutral Navigator + FormatHandler shapes', () => {
    const here: Locator = { href: 'ch1', type: 'application/epub+zip' }
    const prefs: ReadingPreferences = { theme: 'sepia' }

    // A DOM-free Navigator: every member is neutral (no mount, no pageCount here).
    const navigator: Navigator = {
      goTo: async () => {},
      next: async () => {},
      prev: async () => {},
      seek: async () => {},
      currentLocator: () => here,
      applyPreferences: () => {},
      on: () => () => {},
      destroy: () => {},
    }
    expect(navigator.currentLocator()).toBe(here)

    const handler: FormatHandler = {
      id: 'format-noop',
      mediaTypes: ['application/epub+zip'],
      capabilities: { mediaTypes: ['application/epub+zip'] },
      sniff: () => 0,
      open: async () => ({ metadata: { title: 't' }, readingOrder: [] }),
    }
    const options: NavigatorOptions = {
      source: publicationSourceFromBytes(new Uint8Array()),
      preferences: prefs,
    }
    expect(handler.sniff({ mediaType: 'application/epub+zip' })).toBe(0)
    expect(options.preferences?.theme).toBe('sepia')
  })
})
