<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { BookRef, Locator, ProgressSnapshot } from '@/core/model'
import { progressSnapshotFromLocator } from '@/core/model'
import { furthestWins } from '@/core/sync'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { localProgress } from '@/app/sync'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import { useCoverObjectUrl } from '@/app/composables/useCoverObjectUrl'
import { BaseButton, BaseChip, EmptyState, LoadingSpinner, type IconName } from '@/app/components'
import BookDetailHeader from '@/app/components/book-detail/BookDetailHeader.vue'
import BookActionStack from '@/app/components/book-detail/BookActionStack.vue'
import BookProgressCard from '@/app/components/book-detail/BookProgressCard.vue'
import SyncedPerFormatCard from '@/app/components/book-detail/SyncedPerFormatCard.vue'
import BookChaptersSection from '@/app/components/book-detail/BookChaptersSection.vue'

// The Book detail screen (screen 02, doc/web/02-book-detail-desktop.png): a read-only presentation surface
// over the domain model. It takes (sourceId, bookId) from the app-shell book route and the format from the
// query, asks the active Connector for BookMeta and the current format's progress Locator, and renders.
// It owns no domain behaviour — Komga (3), EPUB/TOC (6), the reader (7) and sync (9) wire in beneath it
// with no change here. The connector is read off the store's shallowRef (never destructure-unwrapped, so
// Vue reactivity never walks its internals — the markRaw / shallowRef invariant).
const { sourceId, bookId, mediaType } = defineProps<{
  sourceId: string
  bookId: string
  mediaType: string
}>()

const router = useRouter()
const { connector } = storeToRefs(useLibraryStore())
const downloads = useDownloadsStore()

// getBook needs only the (sourceId, bookId, mediaType) key — the title is what it FETCHES, so the value
// here is a placeholder that merely labels the progress Locator (never user-visible).
const bookRef = computed<BookRef>(() => ({ sourceId, bookId, mediaType, title: bookId }))

// Offline state for the book, keyed per (sourceId, bookId, mediaType) from the offline registry.
const offlineAvailable = computed(() => downloads.isDownloaded(bookRef.value))
const downloading = computed(() => downloads.isDownloading(bookRef.value))

const {
  data: meta,
  isPending,
  error,
} = useQuery({
  key: () => ['book', 'meta', connector.value?.id ?? 'none', sourceId, bookId, mediaType],
  query: () => {
    const active = connector.value
    if (!active) {
      return Promise.reject(new Error('This source does not provide book details.'))
    }
    return active.getBook(bookRef.value)
  },
})

// The cover loads through the connector's AUTHED path (Komga's /thumbnail needs the Authorization
// header), turned into a blob: URL the host owns — never a bare cross-origin <img> that would 401 and
// pop the browser's native Basic-auth dialog. Falls back to a public coverHref, else the placeholder.
const { src: coverSrc } = useCoverObjectUrl(
  () => connector.value,
  () => bookRef.value,
  () => meta.value?.coverHref,
)

// Progress is keyed per (sourceId, bookId, mediaType): the SAME title as EPUB vs PDF keeps separate
// positions, surfaced by the "SYNCED PER FORMAT" card. "No locator" is a legitimate not-started state.
// The displayed position is the FURTHEST of this device's local cache and Komga's server position, so the
// "%" stays consistent with what the reader resumes — even before a write reaches the server, or when the
// server holds a coarser/no EPUB position. (Fixes the documented "no local progress-display fallback" gap.)
const { data: locator } = useQuery({
  key: () => ['book', 'progress', connector.value?.id ?? 'none', sourceId, bookId, mediaType],
  query: async (): Promise<Locator | undefined> => {
    const active = connector.value
    const [local, remote] = await Promise.all([
      localProgress(bookRef.value),
      active
        ? active
            .progressStrategy()
            .getProgress(bookRef.value)
            .catch(() => undefined)
        : undefined,
    ])
    if (local && remote) return furthestWins(local, remote)
    return local ?? remote ?? undefined
  },
})

const snapshot = computed<ProgressSnapshot | undefined>(() =>
  locator.value ? progressSnapshotFromLocator(locator.value) : undefined,
)
const hasProgress = computed(() => {
  const s = snapshot.value
  return s !== undefined && ((s.totalProgression ?? 0) > 0 || (s.position ?? 0) > 0)
})

const authorsLine = computed(() => meta.value?.authors.join(', ') ?? '')
const coverSpine = computed(() => meta.value?.authors[0]?.toUpperCase() ?? '')
const coverStyle = computed(() => ({
  backgroundColor: meta.value?.coverColor ?? 'var(--color-primary)',
}))

// Metadata pills, in the maket order (1813 · English · 432 pages · Fiction · Romance). A fact absent from
// BookMeta simply omits its pill — the row never shows a gap or placeholder.
const pills = computed<{ label: string; icon?: IconName }[]>(() => {
  const m = meta.value
  if (!m) return []
  const out: { label: string; icon?: IconName }[] = []
  if (m.year !== undefined) out.push({ label: String(m.year) })
  if (m.language) out.push({ label: m.language, icon: 'translate' })
  if (m.pageCount !== undefined) out.push({ label: `${m.pageCount} pages` })
  if (m.genres && m.genres.length > 0) out.push({ label: m.genres.join(' · ') })
  return out
})

const errorMessage = computed(() => error.value?.message ?? 'This book could not be loaded.')

function goBack(): void {
  router.back()
}
function openReader(): void {
  // The reader entry point — lands on the placeholder ReaderView until add-reader-navigation (change 7)
  // lights it up; keyed per format so the reader resumes the right position (start when none).
  void router.push({ name: 'reader', params: { sourceId, bookId, mediaType } })
}
function requestOffline(): void {
  // Stream the book to OPFS and register it offline-available (offline-storage). Keyed per format, so the
  // EPUB and PDF of one title download independently. Best-effort — a failed download frees its partial
  // bytes and leaves no completed entry (the store handles cleanup); the indicator simply stays "Offline".
  const active = connector.value
  if (active) void downloads.startDownload(active, bookRef.value)
}
</script>

<template>
  <div class="flex min-h-full flex-col bg-canvas">
    <div v-if="isPending" class="flex flex-1 items-center justify-center py-24">
      <LoadingSpinner label="Loading book…" />
    </div>

    <template v-else-if="meta">
      <BookDetailHeader :breadcrumb="meta.breadcrumb" @back="goBack" />

      <div class="mx-auto w-full max-w-6xl px-8 py-8">
        <div class="flex flex-col gap-8 md:flex-row md:items-start">
          <!-- Left column: cover + action stack. On phone the cover is a centred medium card (doc/mobile/02);
               at md+ it returns to the fixed-width left rail (doc/web/02). -->
          <div class="mx-auto w-48 max-w-full md:mx-0 md:w-64 md:shrink-0">
            <div
              data-decorative-cover
              class="relative aspect-[2/3] w-full overflow-hidden rounded-card shadow-card"
              :style="coverStyle"
            >
              <img
                v-if="coverSrc"
                :src="coverSrc"
                :alt="`Cover of ${meta.title}`"
                class="h-full w-full object-cover"
                fetchpriority="high"
              />
              <!-- Decorative placeholder cover art (title is the accessible <h1> beside it). aria-hidden:
                   exempt from WCAG text-contrast — cover colours are art, not chrome. -->
              <template v-else>
                <span
                  aria-hidden="true"
                  class="absolute inset-x-5 top-5 font-display text-2xl leading-tight text-white/90"
                  >{{ meta.title }}</span
                >
                <span
                  v-if="coverSpine"
                  aria-hidden="true"
                  class="absolute bottom-5 left-5 font-mono text-xs tracking-wider text-white/70 uppercase"
                  >{{ coverSpine }}</span
                >
              </template>
            </div>

            <BookActionStack
              class="mt-5"
              :has-progress="hasProgress"
              :offline-available="offlineAvailable"
              :downloading="downloading"
              @continue="openReader"
              @offline="requestOffline"
            />
          </div>

          <!-- Right column: identity, metadata, cards, chapters. The identity block centres on phone to
               match doc/mobile/02; the cards + description keep their own left alignment. -->
          <div class="min-w-0 flex-1">
            <h1
              class="text-center font-display text-4xl leading-tight text-ink md:text-left md:text-5xl"
            >
              {{ meta.title }}
            </h1>
            <p v-if="authorsLine" class="mt-1 text-center text-lg text-muted md:text-left">
              {{ authorsLine }}
            </p>

            <div
              v-if="pills.length > 0"
              class="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start"
            >
              <BaseChip
                v-for="pill in pills"
                :key="pill.label"
                :icon="pill.icon"
                :label="pill.label"
              />
            </div>

            <p v-if="meta.description" class="mt-5 max-w-2xl leading-relaxed text-ink/80">
              {{ meta.description }}
            </p>

            <div class="mt-7 flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <BookProgressCard class="lg:flex-1" :snapshot="snapshot" />
              <SyncedPerFormatCard class="lg:w-72 lg:shrink-0" />
            </div>

            <BookChaptersSection class="mt-7" :toc="[]" :chapter-count="meta.chapterCount" />
          </div>
        </div>
      </div>
    </template>

    <div v-else class="mx-auto w-full max-w-2xl px-8 py-16">
      <EmptyState icon="library" title="Couldn’t load this book" :message="errorMessage">
        <template #action>
          <BaseButton icon="arrow-left" @click="goBack">Back</BaseButton>
        </template>
      </EmptyState>
    </div>
  </div>
</template>
