<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { derivePlaceholderCoverColor, formatLabel, type LibraryBrowseEntry } from '@/core/model'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { useCoverObjectUrl } from '@/app/composables/useCoverObjectUrl'
import { useLazyVisible } from '@/app/composables/useLazyVisible'

// A "Recently added" cover (doc/web/01): a placeholder colour cover with a format badge (EPUB/CBZ/PDF)
// and a spine label, the title/author beneath. The same entry re-presents as a compact row in `list`
// mode — the grid/list toggle swaps `layout` without losing or reordering entries.
const { entry, layout = 'grid' } = defineProps<{
  entry: LibraryBrowseEntry
  layout?: 'grid' | 'list'
}>()

const subtitle = computed(() => entry.seriesLabel ?? entry.author ?? '')
const format = computed(() => formatLabel(entry.mediaType))
// A deterministic per-book swatch stands in for `entry.coverColor` when a connector hasn't supplied one
// (e.g. Komga, whose cover art is fetched separately below) — the SAME book always gets the SAME colour,
// so an uncovered shelf still reads as distinct titles rather than a repeated tile.
const coverStyle = computed(() => ({
  backgroundColor: entry.coverColor ?? derivePlaceholderCoverColor(entry.bookId),
}))

// Defer the cover fetch until the tile is (almost) on screen: a "Recently added" grid can hold hundreds
// of entries, and firing a `coverBytes` request per tile on mount would storm the connector. The observed
// element is the cover box itself; the same template ref name is bound in both the grid and list branches
// below (only one is ever mounted at a time).
const coverEl = ref<HTMLElement | null>(null)
const isVisible = useLazyVisible(coverEl)

const { connector } = storeToRefs(useLibraryStore())

// Real cover art, once visible. Authed connectors (Komga) fetch bytes through `coverBytes` and get a
// same-origin `blob:` URL back (see useCoverObjectUrl — never a bare cross-origin <img> that would 401);
// connectors with no authed path fall back to `thumbnailHref` directly. Either absent (or not yet visible)
// leaves `coverSrc` undefined, and the colour placeholder above renders through.
const { src: coverSrc } = useCoverObjectUrl(
  () => connector.value,
  () => (isVisible.value ? entry : undefined),
  () => entry.thumbnailHref,
)

// A cover URL that fails to load (a stale or broken thumbnail) falls back to the placeholder instead of
// leaving a broken-image box on the shelf. Resets whenever a new URL is worth trying again.
const imgFailed = ref(false)
watch(coverSrc, () => {
  imgFailed.value = false
})
const showImg = computed(() => coverSrc.value !== undefined && !imgFailed.value)
</script>

<template>
  <!-- Grid: a tall cover with the title/author beneath. -->
  <div v-if="layout === 'grid'" class="flex flex-col gap-2">
    <!-- Placeholder cover (colour + title art) until a real thumbnail loads; `data-decorative-cover` /
         `aria-hidden` because the on-cover text duplicates the accessible title/author below, and both
         the cover colour and the artwork are decoration, not chrome — exempt from WCAG text-contrast and
         removed from the link's accessible name. -->
    <div
      ref="coverEl"
      aria-hidden="true"
      data-decorative-cover
      class="relative aspect-[3/4] w-full overflow-hidden rounded-md p-3"
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
      <!-- Decorative placeholder art (title/format/spine) — ONLY when there is no real cover: a real
           Komga thumbnail already carries the publisher's own title/author art, so drawing our own
           lettering over it would be redundant clutter, not signature design (matches BookDetailView's
           mutually-exclusive img-vs-placeholder pattern). -->
      <template v-else>
        <span class="line-clamp-4 pr-10 font-display text-sm leading-tight text-white/90">{{
          entry.title
        }}</span>
        <span
          class="absolute top-2 right-2 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-white/90 uppercase"
          >{{ format }}</span
        >
        <span
          v-if="entry.spineLabel"
          class="absolute bottom-2.5 left-3 font-mono text-[10px] tracking-wider text-white/70 uppercase"
          >{{ entry.spineLabel }}</span
        >
      </template>
    </div>
    <div class="min-w-0">
      <p class="truncate font-display text-sm text-ink">{{ entry.title }}</p>
      <p v-if="subtitle" class="truncate text-xs text-muted">{{ subtitle }}</p>
    </div>
  </div>

  <!-- List: a compact row, same entry. -->
  <div v-else class="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
    <div
      ref="coverEl"
      aria-hidden="true"
      data-decorative-cover
      class="relative h-14 w-11 shrink-0 overflow-hidden rounded"
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
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate font-display text-sm text-ink">{{ entry.title }}</p>
      <p v-if="subtitle" class="truncate text-xs text-muted">{{ subtitle }}</p>
    </div>
    <span class="shrink-0 font-mono text-[10px] tracking-wide text-muted uppercase">{{
      format
    }}</span>
  </div>
</template>
