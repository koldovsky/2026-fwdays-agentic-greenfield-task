<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { BookRef } from '@/core/model'
import AppShell from '@/app/layouts/AppShell.vue'
import CapabilityMissingModal from '@/app/components/CapabilityMissingModal.vue'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import { useLibraryStore } from '@/app/stores/libraryStore'

// The reader renders full-bleed (its own top bar, no sidebar); every other route gets the shell.
const route = useRoute()
const fullBleed = computed(() => route.meta.fullBleed === true)

// The capability-missing modal lives OUTSIDE the RouterView so it overlays any screen. Declining the
// install (or the unsupported path) degrades to the raw download — the offline-storage path, using the
// Library's active connector. Stores are accessed lazily inside the handler so App mounts without Pinia
// in shell tests (the handler only runs on a user decline).
async function handleDownload(bookRef: BookRef): Promise<void> {
  const connector = useLibraryStore().connector
  if (connector) await useDownloadsStore().startDownload(connector, bookRef)
}
</script>

<template>
  <RouterView v-if="fullBleed" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
  <CapabilityMissingModal :on-download="handleDownload" />
</template>
