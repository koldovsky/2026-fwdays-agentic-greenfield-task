<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { formatLabel, type BookRef } from '@/core/model'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import { AppIcon, BaseButton, EmptyState } from '@/app/components'

// The Downloads list (offline-storage). Renders the offline-available books from the registry with their
// size + format, an offline indicator, and a per-book Remove action that frees the OPFS bytes and
// decrements the sidebar badge / library count. Hydrated from Dexie on mount. Matches the app's warm
// design language: serif heading, monospace for technical metadata (size), calm spacing.

const downloads = useDownloadsStore()

onMounted(() => void downloads.hydrate())

const items = computed(() =>
  [...downloads.completed].sort((a, b) => a.title.localeCompare(b.title)),
)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

function remove(ref: BookRef): void {
  void downloads.removeDownload(ref)
}
</script>

<template>
  <section class="mx-auto max-w-4xl px-8 py-10">
    <header>
      <h1 class="font-display text-4xl text-ink">Downloads</h1>
      <p class="mt-1 text-muted">{{ downloads.downloadedCount }} available offline</p>
    </header>

    <ul v-if="items.length > 0" class="mt-8 flex flex-col gap-2">
      <li
        v-for="item in items"
        :key="`${item.sourceId}:${item.bookId}:${item.mediaType}`"
        class="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3"
        data-testid="download-row"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-control bg-active text-primary"
        >
          <AppIcon name="check" :size="20" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-ink">{{ item.title }}</span>
          <span class="block font-mono text-xs text-muted">
            {{ formatLabel(item.mediaType) }} · {{ formatBytes(item.size) }}
          </span>
        </span>
        <BaseButton
          variant="secondary"
          icon="download"
          @click="
            remove({
              sourceId: item.sourceId,
              bookId: item.bookId,
              mediaType: item.mediaType,
              title: item.title,
            })
          "
        >
          Remove
        </BaseButton>
      </li>
    </ul>

    <EmptyState
      v-else
      class="mt-12"
      icon="download"
      title="No downloads yet"
      message="Download a book from its detail page to read it offline. It will appear here and bypass the network entirely."
    />
  </section>
</template>
