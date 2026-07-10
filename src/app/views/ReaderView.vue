<script setup lang="ts">
// The Reader screen (doc/web/03) — the shell around the foliate Navigator: top bar, two-page parchment
// spread, edge chevrons, and the bottom position bar, full-bleed (route meta.fullBleed → App.vue drops
// the sidebar). It owns the chrome + wiring, NOT the renderer: useNavigator owns the navigator
// lifecycle (markRaw + mount + destroy, ADR-001) and the locatorChanged → sync hand-off. The book's
// identity (title/author) comes from the connector's catalog metadata (consistent with the library and
// book detail); the rendered pages come from the Publication. Themes/typeface/size are change 8 (the
// Aa control is only the trigger); CBZ/PDF readers are later changes.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuery } from '@pinia/colada'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { BookRef, Locator } from '@/core/model'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { useReaderPreferencesStore } from '@/app/stores/readerPreferencesStore'
import { appDispatcher, appEventBus, appRegistry } from '@/app/app-registry'
import { localProgress, syncEngine } from '@/app/sync'
import { reconcileOnOpen, type ProgressConflict } from '@/app/reconcile-progress'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import { useNavigator } from '@/app/composables/useNavigator'
import { BaseButton, EmptyState, LoadingSpinner } from '@/app/components'
import ReaderTopBar from '@/app/components/reader/ReaderTopBar.vue'
import ReaderSpread from '@/app/components/reader/ReaderSpread.vue'
import ReaderChevrons from '@/app/components/reader/ReaderChevrons.vue'
import ReaderPositionBar from '@/app/components/reader/ReaderPositionBar.vue'
import ReaderTocDrawer from '@/app/components/reader/ReaderTocDrawer.vue'
import DisplayPanel from '@/app/components/reader/DisplayPanel.vue'

const { sourceId, bookId, mediaType } = defineProps<{
  sourceId: string
  bookId: string
  mediaType: string
}>()

const router = useRouter()
const { connector } = storeToRefs(useLibraryStore())
const preferences = useReaderPreferencesStore()
const downloads = useDownloadsStore()
const { isOpen: preferencesOpen } = storeToRefs(preferences)

const bookRef = computed<BookRef>(() => ({ sourceId, bookId, mediaType, title: bookId }))

// Catalog metadata for the top-bar identity (the same BookMeta the library/detail render).
const { data: meta } = useQuery({
  key: () => ['reader', 'meta', connector.value?.id ?? 'none', sourceId, bookId, mediaType],
  query: () => {
    const active = connector.value
    if (!active) return Promise.resolve(null)
    return active.getBook(bookRef.value)
  },
})

const bookTitle = computed(() => meta.value?.title ?? bookId)
const author = computed(() => meta.value?.authors.join(', ') ?? '')

// The raw mount element foliate owns. A plain ref → a raw HTMLElement (never a reactive proxy).
const spreadEl = ref<HTMLElement | null>(null)

// On open, reconcile THIS device's local position (the resume source) with Komga's (the source of
// truth). When Komga is meaningfully AHEAD we resume locally but surface a prompt instead of silently
// jumping the reader forward — the product's ask-on-conflict policy (see reconcile-progress.ts).
const remoteJump = ref<ProgressConflict | null>(null)
async function readRemoteProgress(): Promise<Locator | null> {
  const active = connector.value
  if (!active) return null
  try {
    return (await active.progressStrategy().getProgress(bookRef.value)) ?? null
  } catch {
    return null // a progress-read failure must never block opening the book
  }
}
async function resolveInitialLocator(): Promise<Locator | null> {
  const [local, remote] = await Promise.all([localProgress(bookRef.value), readRemoteProgress()])
  const { restore, conflict } = reconcileOnOpen(local, remote)
  remoteJump.value = conflict
  return restore
}

const navigator = useNavigator(spreadEl, {
  connector: connector.value,
  bookRef: bookRef.value,
  registry: appRegistry(),
  // Route the open through the capability dispatcher: a known-but-not-installed format (e.g. PDF) PARKS
  // the open and the dispatcher emits CapabilityMissing → the global modal prompts to install, then the
  // install retries this open in place (DESIGN §8.1). The event bus carries that retry signal.
  dispatcher: appDispatcher(),
  eventBus: appEventBus(),
  // The durable Dexie outbox + furthest-wins drain. The reader only EMITS positions here; the engine owns
  // the writes (per-connector sync invariant). Replaces the change-9 no-op sink.
  syncEngine: syncEngine(),
  // Open a downloaded book straight from OPFS (no network, no connector.content) when it is offline-available.
  getOfflineSource: (ref) => downloads.getPublicationSource(ref),
  // Persisted preferences applied ON OPEN (snapshot at mount; the store rehydrated synchronously), so the
  // book paints already themed — no flash of default styling. useNavigator clones before it crosses (ADR-001).
  preferences: preferences.preferences,
  // Resume on open (read-only — the reader never WRITES progress; the sync engine owns writes): restore
  // the device's local position, reconciled against Komga (may raise the ask-to-jump prompt). Opens at
  // the start when neither this device nor Komga has a stored position.
  getInitialLocator: resolveInitialLocator,
})
const { currentLocator, isLoading, loadError, awaitingCapability, pageCount, toc } = navigator

function resumeFromKomga(): void {
  const jump = remoteJump.value
  remoteJump.value = null
  // Komga's locator carries a total-progression but not a foliate-compatible CFI, so seek the fraction.
  if (jump) void navigator.seek(jump.remoteProgression)
}
const progressPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`

// Live restyle: any reading-preference change re-applies the FULL preference set to the open book through
// the navigator (the wrapper clones to a plain snapshot per ADR-001). App chrome is untouched — only the
// book content document, via the navigator's readium-css seam.
watch(
  () => preferences.preferences,
  (prefs) => navigator.applyPreferences(prefs),
  { deep: true },
)

// --- Position-bar / furniture view-model (derived from the live locator) --------------------------
const isWideViewport = ref(true)
const page = computed(() => currentLocator.value?.locations?.position)
const totalProgression = computed(() => currentLocator.value?.locations?.totalProgression ?? 0)
const chapterLabel = computed(() => currentLocator.value?.title ?? meta.value?.title ?? '')
const rightFolio = computed(() => {
  const current = page.value
  const total = pageCount.value
  return isWideViewport.value && current !== undefined && total !== undefined && current < total
    ? current + 1
    : undefined
})

// --- Top-bar controls ------------------------------------------------------------------------------
const tocOpen = ref(false)
const bookmarks = ref<Locator[]>([])

const bookmarkKey = (locator: Locator): string =>
  `${locator.href}#${locator.locations?.cfi ?? locator.locations?.position ?? ''}`
const bookmarked = computed(() => {
  const current = currentLocator.value
  return current !== null && bookmarks.value.some((b) => bookmarkKey(b) === bookmarkKey(current))
})

function goToLibrary(): void {
  // Leaving the route unmounts this view → useNavigator's onUnmounted destroys the navigator.
  void router.push('/library')
}
function toggleBookmark(): void {
  const current = currentLocator.value
  if (!current) return
  const key = bookmarkKey(current)
  bookmarks.value = bookmarked.value
    ? bookmarks.value.filter((b) => bookmarkKey(b) !== key)
    : [...bookmarks.value, current]
}
function onTocNavigate(locator: Locator): void {
  void navigator.goTo(locator)
  tocOpen.value = false
}

// --- Keyboard navigation (←/→ page, Home/End jump) -------------------------------------------------
function onKeydown(event: KeyboardEvent): void {
  if (isLoading.value || loadError.value || tocOpen.value) return
  const target = event.target as HTMLElement | null
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      void navigator.next()
      break
    case 'ArrowLeft':
      event.preventDefault()
      void navigator.prev()
      break
    case 'Home':
      event.preventDefault()
      void navigator.goHome()
      break
    case 'End':
      event.preventDefault()
      void navigator.goEnd()
      break
  }
}

let mql: MediaQueryList | null = null
function onViewportChange(event: MediaQueryListEvent): void {
  isWideViewport.value = event.matches
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Two-page on desktop, single below the breakpoint (matchMedia is absent in some test environments).
  if (typeof window.matchMedia === 'function') {
    mql = window.matchMedia('(min-width: 768px)')
    isWideViewport.value = mql.matches
    mql.addEventListener('change', onViewportChange)
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  mql?.removeEventListener('change', onViewportChange)
})
</script>

<template>
  <!-- data-reader-theme drives the reader-CHROME variant (top bar, position bar, mat, chevrons) so it
       tracks the active reading theme (main.css § Reader-chrome theme variants) — CHROME tokens only,
       the book itself is still styled exclusively via readium-css inside the frame (Two Palettes Rule). -->
  <div class="flex h-dvh flex-col bg-canvas" :data-reader-theme="preferences.theme">
    <ReaderTopBar
      :title="bookTitle"
      :author="author"
      :toc-open="tocOpen"
      :bookmarked="bookmarked"
      :preferences-active="preferencesOpen"
      @back="goToLibrary"
      @toggle-toc="tocOpen = !tocOpen"
      @toggle-bookmark="toggleBookmark"
      @open-preferences="preferences.toggle"
    />

    <div class="relative flex flex-1 overflow-hidden">
      <!-- Rendered unconditionally so the mount element exists when useNavigator opens the book. -->
      <ReaderSpread
        :book-title="bookTitle"
        :chapter-label="chapterLabel"
        :left-folio="page"
        :right-folio="rightFolio"
      >
        <div ref="spreadEl" class="h-full w-full" data-testid="reader-mount" />
      </ReaderSpread>

      <ReaderChevrons
        v-show="!isLoading && !loadError"
        @prev="navigator.prev"
        @next="navigator.next"
      />

      <div
        v-if="isLoading"
        class="absolute inset-0 grid place-items-center bg-canvas/70"
        data-testid="reader-loading"
      >
        <LoadingSpinner label="Opening book…" />
      </div>

      <div
        v-else-if="loadError"
        class="absolute inset-0 grid place-items-center bg-canvas px-8"
        data-testid="reader-error"
      >
        <EmptyState icon="book-open" title="Couldn’t open this book" :message="loadError.message">
          <template #action>
            <BaseButton icon="arrow-left" @click="goToLibrary">Back to library</BaseButton>
          </template>
        </EmptyState>
      </div>

      <!-- Parked: the format isn't installed. The global capability-missing modal prompts the install
           (and retries this open); this is the fallback shown if the user dismisses it. -->
      <div
        v-else-if="awaitingCapability"
        class="absolute inset-0 grid place-items-center bg-canvas px-8"
        data-testid="reader-awaiting-capability"
      >
        <EmptyState
          icon="extensions"
          title="This book needs an extension"
          message="Install the format support to open this book, or download the file instead."
        >
          <template #action>
            <BaseButton icon="arrow-left" @click="goToLibrary">Back to library</BaseButton>
          </template>
        </EmptyState>
      </div>

      <ReaderTocDrawer
        :open="tocOpen"
        :toc="toc"
        @navigate="onTocNavigate"
        @close="tocOpen = false"
      />

      <!-- Reading-preferences sheet (change 8): app chrome, opened by the top bar's "Aa" trigger. It drives
           the BOOK only through the store -> navigator path (the watch above), never readium-css directly. -->
      <DisplayPanel v-if="preferencesOpen" @close="preferences.close()" />

      <!-- Server-ahead conflict: Komga (the source of truth) is further along than this device. We resume
           locally and ASK before jumping rather than silently yanking the reader forward (ask-on-conflict). -->
      <div
        v-if="remoteJump"
        class="absolute inset-x-0 bottom-4 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-card border border-line bg-canvas px-4 py-3 shadow-card"
        role="dialog"
        aria-label="Resume from Komga?"
        data-testid="reader-progress-conflict"
      >
        <p class="min-w-0 flex-1 text-sm text-ink">
          Komga has you at
          <strong>{{ progressPercent(remoteJump.remoteProgression) }}</strong> — further than this
          device ({{ progressPercent(remoteJump.localProgression) }}).
        </p>
        <BaseButton @click="resumeFromKomga">Resume from Komga</BaseButton>
        <BaseButton variant="secondary" @click="remoteJump = null">Stay here</BaseButton>
      </div>
    </div>

    <ReaderPositionBar
      :chapter-label="chapterLabel"
      :page="page"
      :page-count="pageCount"
      :total-progression="totalProgression"
      :spread="isWideViewport"
      @seek="navigator.seek"
    />
  </div>
</template>
