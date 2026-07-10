// useNavigator lifecycle + reactivity-safety tests (ADR-001). foliate cannot render in jsdom, so the
// format handler / navigator are faked at the WebFormatHandler seam; what's under test is the
// COMPOSABLE's contract: markRaw non-reactivity, destroy-once + unsubscribe on unmount, the cancelled
// guard for an unmount mid-open, and the locatorChanged → syncEngine hand-off (never setProgress).
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent, h, isReactive, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { BookRef, Locator, Publication, ReadingPreferences } from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import type { Connector } from '@/core/contracts'
import type { PluginRegistry } from '@/core/registry'
import type { SyncEngine } from '@/core/sync'
import type { WebNavigator } from '@/platform/web'
import type { FormatHandler, Resolution } from '@/core/contracts'
import { CAPABILITY_INSTALLED_EVENT, type EddaEvents, SimpleEventBus } from '@/core/event-bus'
import {
  useNavigator,
  type OpenDispatcher,
  type UseNavigator,
  type UseNavigatorDeps,
} from './useNavigator'

const BOOK_REF: BookRef = {
  sourceId: 'home-server',
  bookId: 'pride-and-prejudice',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Pride and Prejudice',
}
const START: Locator = { href: 'ch1.xhtml', type: MEDIA_TYPE_EPUB }

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

interface Harness {
  publication: Publication
  navigator: WebNavigator & {
    destroy: ReturnType<typeof vi.fn>
    goTo: ReturnType<typeof vi.fn>
    seek: ReturnType<typeof vi.fn>
  }
  unsubscribe: ReturnType<typeof vi.fn>
  /** Fire a simulated relocate from the renderer. */
  emitLocatorChanged: (locator: Locator) => void
  deps: UseNavigatorDeps
  syncEngine: { enqueue: ReturnType<typeof vi.fn>; drain: ReturnType<typeof vi.fn> }
  /** Resolve a deferred createNavigator (only when `deferNavigator` was set). */
  resolveNavigator: () => void
  /** The handler's createNavigator spy (asserts the options it received, incl. preferences). */
  createNavigatorSpy: ReturnType<typeof vi.fn>
}

function makeHarness(
  options: {
    deferNavigator?: boolean
    getInitialLocator?: UseNavigatorDeps['getInitialLocator']
    preferences?: ReadingPreferences
  } = {},
): Harness {
  const publication: Publication = {
    metadata: { title: 'Pride and Prejudice' },
    readingOrder: [START],
    tableOfContents: [{ href: 'ch1.xhtml', type: MEDIA_TYPE_EPUB, title: 'Chapter I' }],
  }
  let locatorCb: ((detail: unknown) => void) | null = null
  const unsubscribe = vi.fn()
  const navigator = {
    goTo: vi.fn().mockResolvedValue(undefined),
    next: vi.fn().mockResolvedValue(undefined),
    prev: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn().mockResolvedValue(undefined),
    pageCount: vi.fn(() => 432),
    currentLocator: vi.fn(() => START),
    applyPreferences: vi.fn(),
    on: vi.fn((event: string, cb: (detail: unknown) => void) => {
      if (event === 'locatorChanged') locatorCb = cb
      return unsubscribe
    }),
    destroy: vi.fn(),
  } as unknown as Harness['navigator']

  const navDeferred = deferred<WebNavigator>()
  const handler = {
    id: 'format-epub',
    mediaTypes: [MEDIA_TYPE_EPUB],
    capabilities: { mediaTypes: [MEDIA_TYPE_EPUB] },
    sniff: vi.fn(() => 1),
    open: vi.fn().mockResolvedValue(publication),
    createNavigator: vi.fn(() =>
      options.deferNavigator ? navDeferred.promise : Promise.resolve(navigator),
    ),
  }
  const registry = {
    resolveFormat: vi.fn().mockResolvedValue({ status: 'ready', instance: handler }),
  } as unknown as PluginRegistry
  const connector = {
    id: 'connector-fixture',
    content: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  } as unknown as Connector
  const syncEngine = { enqueue: vi.fn(), drain: vi.fn().mockResolvedValue(undefined) }

  return {
    publication,
    navigator,
    unsubscribe,
    emitLocatorChanged: (locator) => locatorCb?.(locator),
    syncEngine,
    resolveNavigator: () => navDeferred.resolve(navigator),
    createNavigatorSpy: handler.createNavigator,
    deps: {
      connector,
      bookRef: BOOK_REF,
      registry,
      syncEngine: syncEngine as unknown as SyncEngine,
      getInitialLocator: options.getInitialLocator,
      preferences: options.preferences,
    },
  }
}

function mountReader(deps: UseNavigatorDeps): {
  api: UseNavigator
  unmount: () => void
} {
  let api!: UseNavigator
  const Comp = defineComponent({
    setup(_, { expose }) {
      const mountEl = ref<HTMLElement | null>(null)
      api = useNavigator(mountEl, deps)
      expose({})
      return () => h('div', { ref: mountEl })
    },
  })
  const wrapper = mount(Comp)
  return { api, unmount: () => wrapper.unmount() }
}

describe('useNavigator', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('holds the Publication and Navigator as NON-reactive objects (markRaw, ADR-001)', async () => {
    const harness = makeHarness()
    const { api } = mountReader(harness.deps)
    await flushPromises()

    // Identity preserved (not wrapped in a reactive proxy) and explicitly non-reactive.
    expect(api.getPublication()).toBe(harness.publication)
    expect(api.getNavigator()).toBe(harness.navigator)
    expect(isReactive(api.getPublication())).toBe(false)
    expect(isReactive(api.getNavigator())).toBe(false)
    expect(api.isLoading.value).toBe(false)
    expect(api.loadError.value).toBeNull()
  })

  it('forwards each locatorChanged to the sync engine and updates the current locator', async () => {
    const harness = makeHarness()
    const { api } = mountReader(harness.deps)
    await flushPromises()

    const moved: Locator = {
      href: 'ch2.xhtml',
      type: MEDIA_TYPE_EPUB,
      title: 'Chapter II',
      locations: { totalProgression: 0.2, position: 12 },
    }
    harness.emitLocatorChanged(moved)

    expect(api.currentLocator.value).toBe(moved)
    expect(harness.syncEngine.enqueue).toHaveBeenCalledTimes(1)
    expect(harness.syncEngine.enqueue).toHaveBeenCalledWith({
      ref: BOOK_REF,
      locator: moved,
      queuedAt: expect.any(Number),
    })
  })

  it('exposes the publication TOC and page count', async () => {
    const harness = makeHarness()
    const { api } = mountReader(harness.deps)
    await flushPromises()
    expect(api.toc.value).toEqual([
      { href: 'ch1.xhtml', type: MEDIA_TYPE_EPUB, title: 'Chapter I' },
    ])
    expect(api.pageCount.value).toBe(432)
  })

  it('destroys the navigator exactly once and unsubscribes on unmount', async () => {
    const harness = makeHarness()
    const { unmount } = mountReader(harness.deps)
    await flushPromises()

    unmount()
    expect(harness.navigator.destroy).toHaveBeenCalledTimes(1)
    expect(harness.unsubscribe).toHaveBeenCalledTimes(1)

    // A second teardown (defensive) does not double-destroy.
    unmount()
    expect(harness.navigator.destroy).toHaveBeenCalledTimes(1)
  })

  it('destroys an orphan navigator and never stores it when unmounted mid-open', async () => {
    const harness = makeHarness({ deferNavigator: true })
    const { api, unmount } = mountReader(harness.deps)
    await flushPromises() // suspended awaiting createNavigator

    expect(api.getNavigator()).toBeNull()
    unmount() // cancels before the navigator resolves
    harness.resolveNavigator()
    await flushPromises()

    expect(harness.navigator.destroy).toHaveBeenCalledTimes(1)
    expect(api.getNavigator()).toBeNull()
    // The orphan's relocate stream was never subscribed → no hand-off.
    expect(harness.syncEngine.enqueue).not.toHaveBeenCalled()
  })

  it('restores a saved position by total-progression when no CFI is available', async () => {
    const harness = makeHarness({
      getInitialLocator: () =>
        Promise.resolve({
          href: 'pride-and-prejudice',
          type: MEDIA_TYPE_EPUB,
          locations: { totalProgression: 0.38 },
        }),
    })
    mountReader(harness.deps)
    await flushPromises()
    expect(harness.navigator.seek).toHaveBeenCalledWith(0.38)
    expect(harness.navigator.goTo).not.toHaveBeenCalled()
  })

  it('restores a saved position by CFI when one is available', async () => {
    const initial: Locator = {
      href: 'ch3.xhtml',
      type: MEDIA_TYPE_EPUB,
      locations: { cfi: 'epubcfi(/6/8!/4/2)' },
    }
    const harness = makeHarness({ getInitialLocator: () => Promise.resolve(initial) })
    mountReader(harness.deps)
    await flushPromises()
    expect(harness.navigator.goTo).toHaveBeenCalledWith(initial)
    expect(harness.navigator.seek).not.toHaveBeenCalled()
  })

  it('falls back to seeking the fraction when a precise CFI restore throws (foreign/stale CFI)', async () => {
    const initial: Locator = {
      href: 'ch3.xhtml',
      type: MEDIA_TYPE_EPUB,
      locations: { cfi: 'epubcfi(/6/8!/4/2)', totalProgression: 0.42 },
    }
    const harness = makeHarness({ getInitialLocator: () => Promise.resolve(initial) })
    harness.navigator.goTo.mockRejectedValueOnce(new Error('stale CFI for this renderer'))
    mountReader(harness.deps)
    await flushPromises()
    expect(harness.navigator.goTo).toHaveBeenCalledWith(initial)
    // The CFI jump failed, so the reader still resumes roughly where it left off via the fraction.
    expect(harness.navigator.seek).toHaveBeenCalledWith(0.42)
  })

  it('surfaces a load error and never enters the loaded state when the connector has no bytes', async () => {
    const harness = makeHarness()
    ;(harness.deps.connector as unknown as { content: ReturnType<typeof vi.fn> }).content = vi
      .fn()
      .mockRejectedValue(new Error('no bytes'))
    const { api } = mountReader(harness.deps)
    await flushPromises()
    expect(api.loadError.value?.message).toBe('no bytes')
    expect(api.isLoading.value).toBe(false)
    expect(api.getNavigator()).toBeNull()
  })

  // ADR-001: preferences cross into the markRaw'd navigator as a PLAIN deproxied snapshot, never a live
  // Vue reactive proxy (which would let Vue walk and corrupt foliate's imperative state).
  it('forwards the on-open preferences to createNavigator as a plain cloned snapshot', async () => {
    const prefs = reactive<ReadingPreferences>({
      theme: 'sepia',
      typeface: 'literata',
      textSizePt: 22,
      layout: 'scroll',
      spacing: 'cozy',
    })
    const harness = makeHarness({ preferences: prefs })
    mountReader(harness.deps)
    await flushPromises()

    const options = harness.createNavigatorSpy.mock.calls[0]?.[2] as {
      preferences?: ReadingPreferences
    }
    expect(options.preferences).toEqual({
      theme: 'sepia',
      typeface: 'literata',
      textSizePt: 22,
      layout: 'scroll',
      spacing: 'cozy',
    })
    expect(isReactive(options.preferences)).toBe(false) // deproxied
    expect(options.preferences).not.toBe(prefs) // a clone, not the live store object
  })

  it('applyPreferences hands the navigator a plain (deproxied) clone, never the reactive proxy', async () => {
    const harness = makeHarness()
    const { api } = mountReader(harness.deps)
    await flushPromises()

    const live = reactive<ReadingPreferences>({ theme: 'dark', textSizePt: 24 })
    api.applyPreferences(live)

    const received = vi.mocked(harness.navigator.applyPreferences).mock.calls[0]?.[0]
    expect(received).toEqual({ theme: 'dark', textSizePt: 24 })
    expect(isReactive(received)).toBe(false)
    expect(received).not.toBe(live)
  })
})

describe('useNavigator — capability dispatch (install-on-demand)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('PARKS a known-but-not-installed format, then retries the open on CapabilityInstalled', async () => {
    const harness = makeHarness()
    const eventBus = new SimpleEventBus<EddaEvents>()
    const suggestion = { id: 'format.epub', name: 'EPUB' } as never

    // The dispatcher reports `installable` until "install" flips it ready — then it resolves to the
    // harness's ready handler (reusing the registry mock, which returns `{ status: 'ready', instance }`).
    let installed = false
    const dispatcher: OpenDispatcher = {
      openBook: vi.fn(() =>
        installed
          ? harness.deps.registry.resolveFormat(BOOK_REF.mediaType)
          : Promise.resolve<Resolution<FormatHandler>>({ status: 'installable', suggestion }),
      ),
    }

    const { api } = mountReader({ ...harness.deps, dispatcher, eventBus })
    await flushPromises()

    // Parked: no navigator, not loading, no error — the global modal is showing.
    expect(api.awaitingCapability.value).toBe(true)
    expect(api.getNavigator()).toBeNull()
    expect(api.isLoading.value).toBe(false)
    expect(api.loadError.value).toBeNull()

    // "Install & open" completes → the bus signals; the parked reader retries and opens the book.
    installed = true
    eventBus.emit(CAPABILITY_INSTALLED_EVENT, { bookRef: BOOK_REF, pluginId: 'format.epub' })
    await flushPromises()

    expect(api.awaitingCapability.value).toBe(false)
    expect(api.getNavigator()).toBe(harness.navigator)
    expect(api.isLoading.value).toBe(false)
  })

  it('surfaces a clear message for an unsupported format', async () => {
    const harness = makeHarness()
    const dispatcher: OpenDispatcher = {
      openBook: vi.fn(() => Promise.resolve<Resolution<FormatHandler>>({ status: 'unsupported' })),
    }
    const { api } = mountReader({ ...harness.deps, dispatcher })
    await flushPromises()

    expect(api.awaitingCapability.value).toBe(false)
    expect(api.loadError.value?.message).toContain('isn’t supported')
    expect(api.getNavigator()).toBeNull()
  })
})
