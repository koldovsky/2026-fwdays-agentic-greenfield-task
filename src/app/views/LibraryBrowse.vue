<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'
import { storeToRefs } from 'pinia'
import type { RouteLocationRaw } from 'vue-router'
import type { Connector } from '@/core/contracts'
import type { LibraryBrowseEntry } from '@/core/model'
import { progressFraction, progressSnapshotFromLocator } from '@/core/model'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { localProgressMap } from '@/app/sync'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import {
  AppIcon,
  BaseChip,
  KeepReadingCard,
  LoadingSpinner,
  RecentlyCoverCard,
  SegmentedControl,
  type SegmentOption,
} from '@/app/components'

// The Library home (doc/web/01-library-desktop.png), rendered from a `Connector` via `browse()`. It
// depends only on the interface — add-connector-komga swaps in Komga with no change here. The catalog
// is fetched through Pinia Colada; search/toggle filter the loaded entries locally (no network).

interface CatalogSummary {
  totalTitles: number
  sourcesCount: number
}

const store = useLibraryStore()
const { connector, lastSyncAt, searchQuery, viewMode } = storeToRefs(store)
const downloadsStore = useDownloadsStore()

const { data, isPending } = useQuery({
  key: () => ['library', 'browse', connector.value?.id ?? 'none'],
  query: () => connector.value?.browse() ?? Promise.resolve<LibraryBrowseEntry[]>([]),
})

// The device's locally-cached positions, overlaid below so a book read on THIS device appears in
// "Keep reading" even when the server's browse feed omits per-book progress (e.g. Komga).
const { data: localMap } = useQuery({
  key: () => ['library', 'local-progress', connector.value?.id ?? 'none'],
  query: () => localProgressMap(),
})

// Catalog entries with the device's local progress overlaid when it is FURTHER than the server's — so the
// displayed position is consistent with what the reader resumes, and locally-read books surface as
// in-progress. A no-op (entries unchanged) when nothing is cached locally.
const allEntries = computed<LibraryBrowseEntry[]>(() => {
  const entries = data.value ?? []
  const map = localMap.value
  if (!map || map.size === 0) return entries
  return entries.map((entry) => {
    const local = map.get(`${entry.sourceId}:${entry.bookId}:${entry.mediaType}`)
    if (!local) return entry
    const localSnapshot = progressSnapshotFromLocator(local)
    const entryFraction = entry.progress ? progressFraction(entry.progress) : 0
    // Overlay only when this device is genuinely further — compare DERIVED fractions so a page-based
    // server position (position/totalPositions, no totalProgression) is never wrongly regressed.
    if (progressFraction(localSnapshot) <= entryFraction) return entry
    return { ...entry, progress: localSnapshot }
  })
})

function isInProgress(entry: LibraryBrowseEntry): boolean {
  const p = entry.progress
  return p !== undefined && ((p.totalProgression ?? 0) > 0 || (p.position ?? 0) > 0)
}

// Local title/author/series filter over the loaded catalog — no round-trip (connector search is later).
const filtered = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return allEntries.value
  return allEntries.value.filter((entry) =>
    [entry.title, entry.author, entry.seriesLabel]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
})

const keepReading = computed(() => filtered.value.filter(isInProgress))
const recentlyAdded = computed(() =>
  filtered.value
    .filter((entry) => !isInProgress(entry))
    .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? '')),
)

// Duck-typed, guarded read of the connector's optional catalog summary (not on the Connector contract).
function readSummary(source: Connector | null, entries: LibraryBrowseEntry[]): CatalogSummary {
  const candidate = (source as { summary?: Partial<CatalogSummary> } | null)?.summary
  return {
    totalTitles:
      typeof candidate?.totalTitles === 'number' ? candidate.totalTitles : entries.length,
    sourcesCount:
      typeof candidate?.sourcesCount === 'number'
        ? candidate.sourcesCount
        : new Set(entries.map((entry) => entry.sourceId)).size,
  }
}

const summary = computed(() => readSummary(connector.value, allEntries.value))
// "N downloaded for offline" is driven by the offline registry (offline-storage) — the real count of
// downloaded books, which the e2e demo grows from zero — not a connector's demo number.
const downloadedForOffline = computed(() => downloadsStore.downloadedCount)
const countsLine = computed(
  () =>
    `${summary.value.totalTitles} titles · ${summary.value.sourcesCount} sources · ${downloadedForOffline.value} downloaded for offline`,
)

const syncedLabel = computed(() => {
  if (lastSyncAt.value === null) return 'Synced just now'
  const minutes = Math.max(0, Math.round((Date.now() - lastSyncAt.value) / 60_000))
  return `Synced ${minutes}m ago`
})

// Proxy narrows the segmented control's `string` back to the store's grid|list union.
const viewModeProxy = computed<string>({
  get: () => viewMode.value,
  set: (value) => {
    viewMode.value = value === 'list' ? 'list' : 'grid'
  },
})

const viewOptions: SegmentOption[] = [
  { value: 'grid', label: 'Grid', icon: 'grid' },
  { value: 'list', label: 'List', icon: 'list' },
]

// A whole card links to the Book detail screen (doc/web/02). mediaType rides the query — progress and
// the reader are keyed per (sourceId, bookId, mediaType), so the card carries the entry's own format.
function bookLink(entry: LibraryBrowseEntry): RouteLocationRaw {
  return {
    name: 'book',
    params: { sourceId: entry.sourceId, bookId: entry.bookId },
    query: { mediaType: entry.mediaType },
  }
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-8 py-10">
    <!-- Header: heading + counts (left); search + sync pill (right) -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl text-ink">Your library</h1>
        <p class="mt-1 text-muted" data-testid="library-counts">{{ countsLine }}</p>
      </div>
      <div class="flex items-center gap-3">
        <form role="search" class="relative" @submit.prevent>
          <label for="library-search" class="sr-only">Search titles, authors</label>
          <AppIcon
            name="search"
            :size="16"
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <!--
            Touch tap target: an <input> can't carry the `.tap-target` ::after (replaced-ish elements have
            no generated content), so on coarse pointers it grows its OWN box to a 46px tap height via
            `py-3`. `-my-1` claws that +8px back out of the layout FLOW (margin box returns to the 38px
            design height) so the header row's height is unchanged — critical, because this field sits
            above the "Recently added" Grid/List toggle, and letting the header grow 8px pushed that
            toggle's centre across the BottomNav's top edge at phone width, making it tap the nav instead
            (impeccable cycle 2 regression fix). Coarse-pointer only, so desktop/golden pixels never move.
          -->
          <input
            id="library-search"
            v-model="searchQuery"
            type="search"
            name="q"
            placeholder="Search titles, authors…"
            class="w-64 rounded-control border border-line bg-surface py-2 pr-3 pl-9 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 pointer-coarse:-my-1 pointer-coarse:py-3"
          />
        </form>
        <BaseChip variant="capability" icon="sync" :label="syncedLabel" data-testid="sync-pill" />
      </div>
    </header>

    <!-- Loading branch -->
    <div v-if="isPending" class="py-16">
      <LoadingSpinner label="Loading your library…" />
    </div>

    <template v-else>
      <!-- Keep reading -->
      <section v-if="keepReading.length > 0" class="mt-10">
        <div class="flex items-center justify-between">
          <h2 class="font-mono text-xs tracking-wider text-muted uppercase">Keep reading</h2>
          <RouterLink to="/library" class="tap-target text-sm text-primary hover:underline"
            >See all</RouterLink
          >
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RouterLink
            v-for="entry in keepReading"
            :key="entry.bookId"
            :to="bookLink(entry)"
            class="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <KeepReadingCard :entry="entry" />
          </RouterLink>
        </div>
      </section>

      <!-- Recently added -->
      <section class="mt-10">
        <div class="flex items-center justify-between">
          <h2 class="font-mono text-xs tracking-wider text-muted uppercase">Recently added</h2>
          <SegmentedControl
            v-model="viewModeProxy"
            :options="viewOptions"
            aria-label="Recently added view"
          />
        </div>

        <div
          v-if="viewMode === 'grid'"
          class="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6"
        >
          <RouterLink
            v-for="entry in recentlyAdded"
            :key="entry.bookId"
            :to="bookLink(entry)"
            class="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RecentlyCoverCard :entry="entry" layout="grid" />
          </RouterLink>
        </div>
        <div v-else class="mt-4 flex flex-col gap-2">
          <RouterLink
            v-for="entry in recentlyAdded"
            :key="entry.bookId"
            :to="bookLink(entry)"
            class="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RecentlyCoverCard :entry="entry" layout="list" />
          </RouterLink>
        </div>
      </section>
    </template>
  </section>
</template>
