<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  derivePlaceholderCoverColor,
  formatLabel,
  progressFraction,
  progressReadout,
  type LibraryBrowseEntry,
} from '@/core/model'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { useCoverObjectUrl } from '@/app/composables/useCoverObjectUrl'
import { useLazyVisible } from '@/app/composables/useLazyVisible'
import BaseCard from './BaseCard.vue'
import ProgressBar from './ProgressBar.vue'

// A horizontal "Keep reading" card (doc/web/01): placeholder cover on the left; title, author/volume
// line, progress readout + bar, and a "<FORMAT> · <source>" meta line on the right.
const { entry } = defineProps<{ entry: LibraryBrowseEntry }>()

// A series/volume label takes the place of a plain author line where present (e.g. "Vol. 4 · …").
const subtitle = computed(() => entry.seriesLabel ?? entry.author ?? '')
const readout = computed(() => (entry.progress ? progressReadout(entry.progress) : ''))
const percent = computed(() => (entry.progress ? progressFraction(entry.progress) * 100 : 0))
const meta = computed(() => {
  const format = formatLabel(entry.mediaType)
  return entry.sourceLabel ? `${format} · ${entry.sourceLabel}` : format
})
// A deterministic per-book swatch stands in for `entry.coverColor` when a connector hasn't supplied one
// (e.g. Komga, whose cover art is fetched separately below) — the SAME book always gets the SAME colour.
const coverStyle = computed(() => ({
  backgroundColor: entry.coverColor ?? derivePlaceholderCoverColor(entry.bookId),
}))

// Defer the cover fetch until the tile is (almost) on screen — see RecentlyCoverCard for the same
// pattern; "Keep reading" is a short row so the storm risk is smaller, but the gate costs nothing here
// and keeps the two cover surfaces consistent.
const coverEl = ref<HTMLElement | null>(null)
const isVisible = useLazyVisible(coverEl)

const { connector } = storeToRefs(useLibraryStore())

const { src: coverSrc } = useCoverObjectUrl(
  () => connector.value,
  () => (isVisible.value ? entry : undefined),
  () => entry.thumbnailHref,
)

// A cover URL that fails to load falls back to the placeholder instead of a broken-image box.
const imgFailed = ref(false)
watch(coverSrc, () => {
  imgFailed.value = false
})
const showImg = computed(() => coverSrc.value !== undefined && !imgFailed.value)
</script>

<template>
  <BaseCard class="flex gap-4">
    <!-- Placeholder cover (colour + title art) until a real thumbnail loads; aria-hidden because the
         on-cover text duplicates the accessible title/author beside it, and both the cover colour and
         the artwork are decoration, not chrome — exempt from WCAG text-contrast. -->
    <div
      ref="coverEl"
      aria-hidden="true"
      data-decorative-cover
      class="relative flex h-32 w-24 shrink-0 flex-col justify-between overflow-hidden rounded-md p-2.5"
      :style="coverStyle"
    >
      <img
        v-if="showImg"
        :src="coverSrc"
        loading="lazy"
        alt=""
        class="h-full w-full object-cover"
        @error="imgFailed = true"
      />
      <!-- Decorative placeholder art — ONLY when there is no real cover; a real Komga thumbnail already
           carries the publisher's own title art (matches BookDetailView's img-vs-placeholder pattern). -->
      <template v-else>
        <span class="line-clamp-3 font-display text-sm leading-tight text-white/90">{{
          entry.title
        }}</span>
        <span
          v-if="entry.spineLabel"
          class="font-mono text-[10px] tracking-wider text-white/70 uppercase"
          >{{ entry.spineLabel }}</span
        >
      </template>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <h3 class="line-clamp-2 font-display text-lg leading-snug text-ink">{{ entry.title }}</h3>
      <p v-if="subtitle" class="mt-0.5 truncate text-sm text-muted">{{ subtitle }}</p>

      <div class="mt-auto pt-3">
        <p class="text-sm text-muted">{{ readout }}</p>
        <ProgressBar :value="percent" :label="readout" class="mt-1.5" />
        <p class="mt-2 text-xs text-muted">{{ meta }}</p>
      </div>
    </div>
  </BaseCard>
</template>
