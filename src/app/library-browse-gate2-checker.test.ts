/**
 * Gate-2 (independent checker) — add-library-browse.
 *
 * Written by a DIFFERENT agent than the maker. Focus on the acceptance criteria
 * and invariants the Gate-2 brief specifies, independent of the maker's test suite:
 *
 * 1. Platform-neutrality: src/core/model/** and src/core/contracts/** have zero
 *    DOM/fetch/window/vue/@app imports (the load-bearing native-client invariant).
 * 2. Serialization: every envelope stamps schemaVersion:1; round-trip deep-equal;
 *    unknown-version throws.
 * 3. FixtureConnector: exactly 9 entries (3 with progressSnapshot / 6 without);
 *    exact progress readouts; progress keyed per (sourceId,bookId,mediaType) so the
 *    same bookId in different formats yields independent positions.
 * 4. LibraryView without connector → EmptyState (change-1 invariant preserved).
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { LibraryBrowseEntry, Locator, Publication } from '@/core/model'
import {
  MEDIA_TYPE_CBZ,
  MEDIA_TYPE_EPUB,
  MEDIA_TYPE_PDF,
  progressReadout,
  progressFraction,
} from '@/core/model'
import {
  SCHEMA_VERSION,
  SerializationError,
  serializeLocator,
  parseLocator,
  serializePublication,
  parsePublication,
  serializeLibraryBrowseEntry,
  parseLibraryBrowseEntry,
} from '@/core/model/serialization'
import FixtureConnector from '@/plugins/connectors/fixture'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import LibraryView from '@/app/views/LibraryView.vue'

// ── 1. Platform-neutrality invariant ─────────────────────────────────────────
//
// Core/model and core/contracts must carry zero web-only assumptions.
// This is a static-scan test: we read the source files directly (no bundle,
// no transpile) and assert the absence of forbidden patterns.

// Vitest (jsdom) transforms import.meta.url to a /@fs/ Vite URL, not a file:// URL,
// so pathname would carry the /@fs/ prefix. process.cwd() reliably gives the repo root.
const REPO_ROOT = process.cwd()

/** Recursively collect all .ts source files (excluding tests) under a directory. */
function collectSourceTs(dir: string): string[] {
  const paths: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      paths.push(...collectSourceTs(full))
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      paths.push(full)
    }
  }
  return paths
}

const CORE_MODEL_DIR = join(REPO_ROOT, 'src/core/model')
const CORE_CONTRACTS_DIR = join(REPO_ROOT, 'src/core/contracts')
const coreSourceFiles = [...collectSourceTs(CORE_MODEL_DIR), ...collectSourceTs(CORE_CONTRACTS_DIR)]

/** Pattern descriptors: [regex, human label]. A match in a core source file is a violation. */
const FORBIDDEN_PATTERNS: [RegExp, string][] = [
  // Forbidden import sources
  [/from ['"]vue['"]/, "Vue runtime import ('vue')"],
  [/from ['"]@\/app/, '@/app import (crosses into UI layer)'],
  [/from ['"]@pinia/, '@pinia import (UI-layer state)'],
  [/from ['"]vue-router/, 'vue-router import'],
  // Forbidden web-only globals (function calls and property accesses)
  [/\bwindow\s*[.[]/, 'window global access'],
  [/\bdocument\s*[.[]/, 'document global access'],
  [/\bfetch\s*\(/, 'fetch() call'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest reference'],
  [/\blocalStorage\b/, 'localStorage reference'],
  [/\bsessionStorage\b/, 'sessionStorage reference'],
  // Forbidden DOM type annotations (these leak web-only types into the contract)
  [/:\s*HTMLElement\b/, 'HTMLElement type annotation'],
  [/:\s*EventTarget\b/, 'EventTarget type annotation'],
]

describe('platform-neutrality invariant — src/core/model/** and src/core/contracts/**', () => {
  it('analyzed at least the core source files this change added or touched', () => {
    // At minimum: model/index.ts, model/serialization.ts, contracts/index.ts
    const relPaths = coreSourceFiles.map((f) => relative(REPO_ROOT, f))
    expect(relPaths).toContain('src/core/model/index.ts')
    expect(relPaths).toContain('src/core/model/serialization.ts')
    expect(relPaths).toContain('src/core/contracts/index.ts')
    expect(coreSourceFiles.length).toBeGreaterThanOrEqual(3)
  })

  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    it(`no core source file contains: ${label}`, () => {
      const violations: string[] = []
      for (const file of coreSourceFiles) {
        const src = readFileSync(file, 'utf-8')
        const lines = src.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i]!)) {
            violations.push(`${relative(REPO_ROOT, file)}:${i + 1}  ${lines[i]!.trim()}`)
          }
        }
      }
      expect(
        violations,
        `Platform violation (${label}) found in core source:\n${violations.join('\n')}`,
      ).toHaveLength(0)
    })
  }
})

// ── 2. Serialization — schemaVersion:1 on every envelope; round-trip; error paths ─

const sampleLocator: Locator = {
  href: 'ch2.xhtml',
  type: MEDIA_TYPE_EPUB,
  title: 'Chapter 2',
  locations: { progression: 0.25, totalProgression: 0.38, position: 12 },
}

const samplePublication: Publication = {
  metadata: { title: 'Pride and Prejudice', author: 'Jane Austen', language: 'en' },
  readingOrder: [{ href: 'ch1.xhtml', type: MEDIA_TYPE_EPUB }],
  layout: 'reflowable',
}

const sampleEntry: LibraryBrowseEntry = {
  sourceId: 'home-server',
  bookId: 'pride-and-prejudice',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Pride and Prejudice',
  author: 'Jane Austen',
  coverColor: '#6f7457',
  sourceLabel: 'komga',
  addedAt: '2026-05-02T09:00:00.000Z',
  progress: { totalProgression: 0.38, minutesLeft: 72 },
}

describe('serialization — schemaVersion:1 stamped on all three types', () => {
  it('Locator envelope carries schemaVersion === 1', () => {
    const parsed = JSON.parse(serializeLocator(sampleLocator))
    expect(parsed.schemaVersion).toBe(1)
    expect(SCHEMA_VERSION).toBe(1) // conformance-baseline constant
  })

  it('Publication envelope carries schemaVersion === 1', () => {
    const parsed = JSON.parse(serializePublication(samplePublication))
    expect(parsed.schemaVersion).toBe(1)
  })

  it('LibraryBrowseEntry envelope carries schemaVersion === 1', () => {
    const parsed = JSON.parse(serializeLibraryBrowseEntry(sampleEntry))
    expect(parsed.schemaVersion).toBe(1)
  })

  it('all three serialized forms have the same schemaVersion (consistency check)', () => {
    const versions = [
      JSON.parse(serializeLocator(sampleLocator)).schemaVersion,
      JSON.parse(serializePublication(samplePublication)).schemaVersion,
      JSON.parse(serializeLibraryBrowseEntry(sampleEntry)).schemaVersion,
    ]
    expect(new Set(versions).size).toBe(1) // all identical
    expect(versions[0]).toBe(1)
  })
})

describe('serialization — round-trip deep-equality for all three types', () => {
  it('Locator: parse(serialize(x)) deep-equals x', () => {
    expect(parseLocator(serializeLocator(sampleLocator))).toEqual(sampleLocator)
  })

  it('Publication: parse(serialize(x)) deep-equals x, layout discriminator preserved', () => {
    expect(parsePublication(serializePublication(samplePublication))).toEqual(samplePublication)
  })

  it('LibraryBrowseEntry: parse(serialize(x)) deep-equals x, progress snapshot preserved', () => {
    expect(parseLibraryBrowseEntry(serializeLibraryBrowseEntry(sampleEntry))).toEqual(sampleEntry)
  })
})

describe('serialization — throws SerializationError on bad input', () => {
  it('throws on unknown schemaVersion (e.g. version 99)', () => {
    const futureEnvelope = JSON.stringify({ schemaVersion: 99, type: 'Locator', payload: {} })
    expect(() => parseLocator(futureEnvelope)).toThrow(SerializationError)
  })

  it('throws on type mismatch: LibraryBrowseEntry serialized but parsed as Locator', () => {
    expect(() => parseLocator(serializeLibraryBrowseEntry(sampleEntry))).toThrow(SerializationError)
  })

  it('throws on type mismatch: Locator serialized but parsed as Publication', () => {
    expect(() => parsePublication(serializeLocator(sampleLocator))).toThrow(SerializationError)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseLocator('{not valid json')).toThrow(SerializationError)
  })

  it('throws on a plain object that lacks the envelope shape', () => {
    expect(() => parseLocator(JSON.stringify({ href: 'ch1', type: 'epub' }))).toThrow(
      SerializationError,
    )
  })
})

// ── 3. FixtureConnector — exact counts, readouts, and progress keying ─────────

describe('FixtureConnector — exact 9 entries: 3 in-progress + 6 recently-added', () => {
  it('browse() resolves with exactly 9 entries', async () => {
    const entries = await new FixtureConnector().browse()
    expect(entries).toHaveLength(9)
  })

  it('exactly 3 entries carry a non-zero progress snapshot (the "Keep reading" cards)', async () => {
    const entries = await new FixtureConnector().browse()
    const inProgress = entries.filter(
      (e) =>
        e.progress !== undefined &&
        ((e.progress.totalProgression ?? 0) > 0 || (e.progress.position ?? 0) > 0),
    )
    expect(inProgress).toHaveLength(3)
  })

  it('exactly 6 entries have no progress snapshot (the "Recently added" covers)', async () => {
    const entries = await new FixtureConnector().browse()
    const recentlyAdded = entries.filter((e) => e.progress === undefined)
    expect(recentlyAdded).toHaveLength(6)
  })
})

describe('FixtureConnector — exact acceptance-criteria readouts', () => {
  it('"38% · 1h 12m left" for Pride and Prejudice (EPUB, totalProgression 0.38, minutesLeft 72)', async () => {
    const entries = await new FixtureConnector().browse()
    const pride = entries.find((e) => e.title === 'Pride and Prejudice')!
    expect(pride).toBeDefined()
    expect(pride.mediaType).toBe(MEDIA_TYPE_EPUB)
    expect(pride.sourceLabel).toBe('komga')
    expect(progressReadout(pride.progress!)).toBe('38% · 1h 12m left')
    expect(Math.round(progressFraction(pride.progress!) * 100)).toBe(38)
  })

  it('"page 88 / 192" for Saltmoon (CBZ, position 88 / totalPositions 192)', async () => {
    const entries = await new FixtureConnector().browse()
    const saltmoon = entries.find((e) => e.title === 'Saltmoon')!
    expect(saltmoon).toBeDefined()
    expect(saltmoon.mediaType).toBe(MEDIA_TYPE_CBZ)
    expect(saltmoon.sourceLabel).toBe('komga')
    expect(saltmoon.seriesLabel).toBe('Vol. 4 · R. Okonkwo')
    expect(progressReadout(saltmoon.progress!)).toBe('page 88 / 192')
  })

  it('"12% · just started" for Dorian Gray (PDF, totalProgression 0.12, no minutesLeft)', async () => {
    const entries = await new FixtureConnector().browse()
    const dorian = entries.find((e) => e.title === 'Dorian Gray')!
    expect(dorian).toBeDefined()
    expect(dorian.mediaType).toBe(MEDIA_TYPE_PDF)
    expect(dorian.sourceLabel).toBe('calibre')
    expect(progressReadout(dorian.progress!)).toBe('12% · just started')
  })

  it('all six recently-added titles are present in the catalog', async () => {
    const entries = await new FixtureConnector().browse()
    const noProgress = entries.filter((e) => e.progress === undefined)
    const titles = noProgress.map((e) => e.title)
    expect(titles).toContain('Frankenstein')
    expect(titles).toContain('Moby-Dick')
    expect(titles).toContain('Dracula')
    expect(titles).toContain('The Tin Forest')
    expect(titles).toContain('Great Expectations')
    expect(titles).toContain('Jane Eyre')
  })
})

describe('FixtureConnector — progress keying: (sourceId, bookId, mediaType)', () => {
  it('writing EPUB progress does not bleed into PDF progress for the same bookId', async () => {
    const connector = new FixtureConnector()
    const strategy = connector.progressStrategy()
    const epubRef = { sourceId: 'src', bookId: 'dual', mediaType: MEDIA_TYPE_EPUB, title: 'Dual' }
    const pdfRef = { ...epubRef, mediaType: MEDIA_TYPE_PDF }

    await strategy.setProgress(epubRef, {
      href: 'dual',
      type: MEDIA_TYPE_EPUB,
      locations: { totalProgression: 0.75 },
    })

    // Same sourceId + bookId but different mediaType → independent key → no bleed-through.
    const epubLoc = await strategy.getProgress(epubRef)
    const pdfLoc = await strategy.getProgress(pdfRef)
    expect(epubLoc?.locations?.totalProgression).toBe(0.75)
    expect(pdfLoc).toBeUndefined()
  })

  it('same bookId in different sources are also independent', async () => {
    const strategy = new FixtureConnector().progressStrategy()
    const src1 = { sourceId: 'server-a', bookId: 'book-x', mediaType: MEDIA_TYPE_EPUB, title: 'X' }
    const src2 = { ...src1, sourceId: 'server-b' }

    await strategy.setProgress(src1, {
      href: 'book-x',
      type: MEDIA_TYPE_EPUB,
      locations: { totalProgression: 0.2 },
    })

    expect((await strategy.getProgress(src1))?.locations?.totalProgression).toBe(0.2)
    expect(await strategy.getProgress(src2)).toBeUndefined()
  })
})

// ── 4. LibraryView without connector → EmptyState (change-1 invariant) ───────

describe('LibraryView — change-1 invariant: no connector → EmptyState renders', () => {
  it('renders "Connect a source to begin" without Pinia/connector at all', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/library', component: { template: '<div />' } },
        { path: '/settings/sources/add', component: { template: '<div />' } },
      ],
    })
    await router.push('/library')
    await router.isReady()
    // Mount with only a router, NO Pinia — the component must not throw and must show EmptyState.
    const wrapper = mount(LibraryView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Connect a source to begin')
    expect(wrapper.text()).not.toContain('Keep reading')
    expect(wrapper.text()).not.toContain('Recently added')
  })
})
