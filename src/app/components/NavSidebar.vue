<script setup lang="ts">
import { computed } from 'vue'
import { getActivePinia } from 'pinia'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import SidebarLink from './SidebarLink.vue'
import StatusDot from './StatusDot.vue'
import { useSourcesStore } from '@/app/stores/sourcesStore'
import { useDownloadsStore } from '@/app/stores/downloadsStore'

// The persistent left chrome (doc/web/01 + 06). Two modes by route:
//  - default → a "Sources" region (the connected sources) + a Settings footer
//  - /settings/* → a "Settings" region; Sources & footer hidden
// Only screens that actually exist are linked: Home / Search and the Reading / General settings pages
// are not implemented yet, so they are deliberately NOT in the nav (no links to placeholder stubs).
// Settings lands on the one working settings screen, Extensions.
// Chrome only (no core/connector imports). The Sources region is now driven by the sources store
// (add-source-flow): a freshly-connected source appears here; empty until the user adds one. Guarded
// for the no-Pinia case so the app shell still renders (mirrors LibraryView).

const route = useRoute()
const inSettings = computed(() => route.path === '/settings' || route.path.startsWith('/settings/'))

const sourcesStore = getActivePinia() ? useSourcesStore() : null
const sources = computed(() => sourcesStore?.sources ?? [])

// The Downloads badge count is driven by the offline registry (offline-storage), not a hardcoded number:
// downloading a book increments it, removing decrements it. Hidden at zero (no "0" pill).
const downloadsStore = getActivePinia() ? useDownloadsStore() : null
const downloadsBadge = computed(() => {
  const count = downloadsStore?.downloadedCount ?? 0
  return count > 0 ? count : undefined
})
</script>

<template>
  <aside
    class="hidden h-full w-64 shrink-0 flex-col border-r border-line bg-canvas px-3 py-5 md:flex"
  >
    <!-- Wordmark -->
    <RouterLink to="/" class="flex items-center gap-3 px-3 py-1">
      <span class="flex size-9 items-center justify-center rounded-full bg-active text-primary">
        <AppIcon name="leaf" :size="22" />
      </span>
      <span class="font-display text-2xl text-ink">Edda</span>
    </RouterLink>

    <nav class="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Primary">
      <SidebarLink to="/library" icon="library">Library</SidebarLink>
      <SidebarLink to="/downloads" icon="download" :badge="downloadsBadge">Downloads</SidebarLink>

      <!-- Sources region (default mode) -->
      <template v-if="!inSettings">
        <p class="px-3 pt-6 pb-2 font-mono text-xs tracking-wider text-muted uppercase">Sources</p>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="source in sources"
            :key="source.sourceId"
            class="flex gap-2.5 rounded-control px-3 py-2"
          >
            <StatusDot tone="connected" class="mt-1.5" />
            <span class="min-w-0">
              <span class="block truncate text-sm text-ink">{{ source.name }}</span>
              <span class="block truncate font-mono text-xs text-muted">{{
                source.descriptor
              }}</span>
            </span>
          </li>
        </ul>
        <SidebarLink to="/settings/sources/add" icon="add">Add source</SidebarLink>
      </template>

      <!-- Settings region (/settings/*). Only Extensions exists today; Reading/General are not
           implemented yet, so they are not listed (no dead links to placeholder screens). -->
      <template v-else>
        <p class="px-3 pt-6 pb-2 font-mono text-xs tracking-wider text-muted uppercase">Settings</p>
        <SidebarLink to="/settings/extensions" icon="extensions">Extensions</SidebarLink>
      </template>
    </nav>

    <!-- Footer (default mode only — in settings the region above already lists this). A single
         "Settings" entry that opens the one working settings screen (Extensions). -->
    <div v-if="!inSettings" class="flex flex-col gap-0.5 border-t border-line pt-3">
      <SidebarLink to="/settings/extensions" icon="settings">Settings</SidebarLink>
    </div>
  </aside>
</template>
