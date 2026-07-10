// The reader's navigator lifecycle, owned in one place (DESIGN-CONNECTORS.md §5.2 + ADR-001). Given a mount
// element and the route's book identity, it: resolves the EPUB format handler from the registry,
// narrows it to a WebFormatHandler, pulls book bytes from the connector (NOT a SW-intercepted URL —
// ADR-005), parses the Publication metadata/TOC for the chrome, then creates the Navigator into the RAW
// HTMLElement, tracks the current locator, and forwards every position to the sync engine's intake. On
// unmount it destroys the navigator, drops its subscription, and clears the mount — exactly once.
//
// ADR-013 (reader origin isolation): the Navigator returned for an EPUB is a PROXY — the foliate engine
// renders inside a cross-origin reader frame, and `createNavigator` builds that frame + bridge and
// transfers the book bytes into it. Metadata/TOC are parsed in-app (a headless, script-free parse) so
// the chrome's title/TOC are ready synchronously; the parse runs BEFORE the byte transfer, and the proxy
// transfers a COPY of the buffer, so the parsed bytes are never neutered.
//
// Load-bearing reactivity rule (ADR-001): the imperative renderer objects (`Publication`, `Navigator`)
// are held as PLAIN closure variables and `markRaw()`'d — NEVER `ref`/`reactive`/`shallowRef` — so Vue's
// proxy never walks the navigator's live iframe / MessagePorts and desyncs paging. Only plain view-model
// data (the current locator, page count, TOC, loading flags) is reactive.

import { markRaw, onMounted, onUnmounted, ref, shallowRef, toRaw, type Ref } from 'vue'
import type {
  Connector,
  FormatHandler,
  NavigatorOptions,
  PublicationSource,
  Resolution,
} from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'
import type { BookRef, Locator, Publication, ReadingPreferences } from '@/core/model'
import type { PluginRegistry } from '@/core/registry'
import { CAPABILITY_INSTALLED_EVENT, type EddaEventBus } from '@/core/event-bus'
import type { SyncEngine } from '@/core/sync'
import { isWebFormatHandler, type WebNavigator } from '@/platform/web'

/** The slice of the capability dispatcher useNavigator needs to resolve (and drive the install flow). */
export interface OpenDispatcher {
  openBook(bookRef: BookRef): Promise<Resolution<FormatHandler>>
}

export interface UseNavigatorDeps {
  /** The active content source — supplies book bytes via `content(ref)`. Null ⇒ no source connected. */
  connector: Connector | null
  /** The book to open, keyed per `(sourceId, bookId, mediaType)`. */
  bookRef: BookRef
  /** Resolves the format handler for the book's media type (the fallback when no dispatcher is given). */
  registry: PluginRegistry
  /**
   * The capability dispatcher. When provided, an `installable` format PARKS the open (the dispatcher
   * emits CapabilityMissing → the global modal drives install + retry) instead of erroring, and an
   * `unsupported` format surfaces a clear message. Absent ⇒ resolve straight through `registry`.
   */
  dispatcher?: OpenDispatcher
  /** The host event bus — useNavigator subscribes to CAPABILITY_INSTALLED to retry a parked open. */
  eventBus?: EddaEventBus
  /** Where each `locatorChanged` is forwarded — the reader NEVER writes progress to a server itself. */
  syncEngine: SyncEngine
  /**
   * The persisted reading preferences to apply ON OPEN, so the book paints already themed (no flash of
   * default styling). A plain snapshot at mount time; cloned again here before it crosses to the navigator
   * (ADR-001). Subsequent live changes go through {@link UseNavigator.applyPreferences}.
   */
  preferences?: ReadingPreferences
  /**
   * Optional resumable position to restore on open (read-only — the reader reads progress to resume
   * but never WRITES it; the sync engine owns writes). Returns the saved locator or nullish.
   */
  getInitialLocator?: () => Promise<Locator | null | undefined>
  /**
   * Optional OFFLINE byte source for a downloaded book. When it resolves a {@link PublicationSource} the
   * reader opens from OPFS (`File.slice`, no `connector.content()` — the book reads with NO network, ADR-005);
   * a `null` result means "not downloaded" and the reader falls back to the connector's bytes.
   */
  getOfflineSource?: (ref: BookRef) => Promise<PublicationSource | null>
}

export interface UseNavigator {
  /** The current reading position (drives the position bar). Reactive view-model, not the renderer. */
  currentLocator: Ref<Locator | null>
  isLoading: Ref<boolean>
  loadError: Ref<Error | null>
  /** True while the book's format is known-but-not-installed: the open is PARKED pending an install
   *  (the global capability-missing modal is showing). Cleared once the retry opens the book. */
  awaitingCapability: Ref<boolean>
  /** Total pages in the current layout (the position bar's "/ N"), or `undefined` pre-render. */
  pageCount: Ref<number | undefined>
  /** The publication's table of contents (chapter list for the TOC drawer). Plain, safe-to-proxy data. */
  toc: Ref<readonly Locator[]>
  goTo: (locator: Locator) => Promise<void>
  next: () => Promise<void>
  prev: () => Promise<void>
  goHome: () => Promise<void>
  goEnd: () => Promise<void>
  seek: (fraction: number) => Promise<void>
  /** Apply a live reading-preference change to the open book (ADR-001: cloned to a plain snapshot here). */
  applyPreferences: (preferences: ReadingPreferences) => void
  /** The raw (non-reactive) Publication — for inspection/tests; the view reads {@link toc} instead. */
  getPublication: () => Publication | null
  /** The raw (non-reactive) Navigator — for inspection/tests; the view drives it via the methods. */
  getNavigator: () => WebNavigator | null
}

export function useNavigator(mount: Ref<HTMLElement | null>, deps: UseNavigatorDeps): UseNavigator {
  const currentLocator = shallowRef<Locator | null>(null)
  const isLoading = ref(true)
  const loadError = ref<Error | null>(null)
  const awaitingCapability = ref(false)
  const pageCount = ref<number | undefined>(undefined)
  const toc = shallowRef<readonly Locator[]>([])

  // Imperative renderer objects — PLAIN closure variables, never reactive (ADR-001).
  let publication: Publication | null = null
  let navigator: WebNavigator | null = null
  let unsubscribe: (() => void) | null = null
  let retryUnsubscribe: (() => void) | null = null
  // Guards: `cancelled` aborts the async open if the component unmounts mid-flight; `torn` makes
  // teardown idempotent; `opened` stops a retry from double-opening an already-rendered book.
  let cancelled = false
  let torn = false
  let opened = false

  /** Resolve the open through the dispatcher (drives the install flow) or straight via the registry. */
  function resolveOpen(): Promise<Resolution<FormatHandler>> {
    return deps.dispatcher
      ? deps.dispatcher.openBook(deps.bookRef)
      : deps.registry.resolveFormat(deps.bookRef.mediaType)
  }

  function teardown(): void {
    if (torn) return
    torn = true
    retryUnsubscribe?.()
    retryUnsubscribe = null
    unsubscribe?.()
    unsubscribe = null
    navigator?.destroy()
    navigator = null
    publication = null
    // destroy() already removes the <foliate-view>; clear any stragglers so the element is empty.
    mount.value?.replaceChildren()
  }

  async function runOpen(): Promise<void> {
    if (cancelled || opened) return
    isLoading.value = true
    loadError.value = null
    awaitingCapability.value = false
    try {
      const connector = deps.connector
      if (!connector) throw new Error('No source is connected.')
      const resolution = await resolveOpen()
      if (cancelled) return
      if (resolution.status === 'installable') {
        // Known-but-not-installed: PARK. The dispatcher already emitted CapabilityMissing, so the global
        // modal shows the install prompt; a CAPABILITY_INSTALLED event retries this open in place.
        awaitingCapability.value = true
        return
      }
      if (resolution.status === 'unsupported') {
        throw new Error(`This format isn’t supported yet: “${deps.bookRef.mediaType}”.`)
      }
      const handler = resolution.instance
      if (!isWebFormatHandler(handler)) {
        throw new Error(`The "${handler.id}" format cannot render in this app.`)
      }

      // Prefer the OFFLINE byte source for a downloaded book: ranged `File.slice` reads from OPFS, no
      // `connector.content()` and no network (ADR-005). Otherwise book bytes come from the connector as a
      // buffer (still NOT a service-worker-intercepted URL fetch). Either neutral `PublicationSource` feeds
      // both the metadata parse and the renderer.
      const offlineSource = deps.getOfflineSource ? await deps.getOfflineSource(deps.bookRef) : null
      if (cancelled) return
      let source: PublicationSource
      if (offlineSource) {
        source = offlineSource
      } else {
        const bytes = await connector.content(deps.bookRef)
        if (cancelled) return
        source = publicationSourceFromBytes(bytes)
      }

      const parsed = await handler.open(source)
      if (cancelled) return
      publication = markRaw(parsed)

      const element = mount.value
      if (!element) throw new Error('The reader mount element is not available.')
      const navOptions: NavigatorOptions = { source }
      // ADR-001: hand the navigator a PLAIN, deproxied snapshot — never a live Vue reactive object —
      // so the persisted theme/typeface/size/layout reach the frame in the `open` command (themed first paint).
      if (deps.preferences) navOptions.preferences = structuredClone(toRaw(deps.preferences))
      const created = await handler.createNavigator(publication, element, navOptions)
      if (cancelled) {
        // Unmounted while createNavigator was in flight: destroy the orphan, never store it.
        created.destroy()
        return
      }
      navigator = markRaw(created)
      opened = true

      toc.value = publication.tableOfContents ?? []
      pageCount.value = navigator.pageCount()
      currentLocator.value = navigator.currentLocator()

      unsubscribe = navigator.on('locatorChanged', (locator) => {
        currentLocator.value = locator
        pageCount.value = navigator?.pageCount()
        // The one-directional hand-off: emit the position; the engine owns the durable outbox.
        deps.syncEngine.enqueue({ ref: deps.bookRef, locator, queuedAt: Date.now() })
      })

      // Restore a resumable position if one is supplied: prefer a precise CFI, else seek the saved
      // total-progression fraction. Best-effort — a stale locator never blocks open. If a precise CFI
      // restore throws (e.g. a foreign/stale CFI from another renderer or device), fall back to the
      // fraction so the reader still resumes roughly where it left off rather than at page 1.
      const initial = await deps.getInitialLocator?.()
      if (!cancelled && navigator && initial) {
        const totalProgression = initial.locations?.totalProgression
        try {
          if (initial.locations?.cfi) {
            await navigator.goTo(initial)
          } else if (typeof totalProgression === 'number') {
            await navigator.seek(totalProgression)
          }
        } catch (error) {
          if (typeof totalProgression === 'number') {
            try {
              await navigator.seek(totalProgression)
            } catch (fallbackError) {
              console.error('Could not restore reading position', fallbackError)
            }
          } else {
            console.error('Could not restore reading position', error)
          }
        }
      }
    } catch (error) {
      if (!cancelled) {
        loadError.value = error instanceof Error ? error : new Error(String(error))
      }
    } finally {
      if (!cancelled) isLoading.value = false
    }
  }

  onMounted(() => {
    void runOpen()
    // Retry a PARKED open once its capability is installed (the modal's "Install & open" path). Matched
    // per media type so an unrelated install does not re-trigger this reader.
    retryUnsubscribe =
      deps.eventBus?.on(CAPABILITY_INSTALLED_EVENT, (payload) => {
        if (
          !cancelled &&
          !opened &&
          awaitingCapability.value &&
          payload.bookRef.mediaType === deps.bookRef.mediaType
        ) {
          void runOpen()
        }
      }) ?? null
  })

  onUnmounted(() => {
    cancelled = true
    teardown()
  })

  return {
    currentLocator,
    isLoading,
    loadError,
    awaitingCapability,
    pageCount,
    toc,
    goTo: (locator) => navigator?.goTo(locator) ?? Promise.resolve(),
    next: () => navigator?.next() ?? Promise.resolve(),
    prev: () => navigator?.prev() ?? Promise.resolve(),
    goHome: () => navigator?.seek(0) ?? Promise.resolve(),
    goEnd: () => navigator?.seek(1) ?? Promise.resolve(),
    seek: (fraction) => navigator?.seek(fraction) ?? Promise.resolve(),
    applyPreferences: (preferences) => {
      // ADR-001: clone ONCE here so NO caller can hand the markRaw'd navigator a live reactive proxy
      // (which would let Vue walk and corrupt foliate's imperative state). toRaw unwraps, structuredClone
      // detaches into a plain JSON-native snapshot the bridge transfers.
      navigator?.applyPreferences(structuredClone(toRaw(preferences)))
    },
    getPublication: () => publication,
    getNavigator: () => navigator,
  }
}
