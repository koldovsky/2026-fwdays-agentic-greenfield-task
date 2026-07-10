import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { Connector } from '@/core/contracts'

/** The Library's view mode for the "Recently added" section. */
export type LibraryViewMode = 'grid' | 'list'

/**
 * Library state. The bound `Connector` is held in a **`shallowRef`** — the store-boundary analogue of
 * `markRaw()` (CLAUDE.md load-bearing invariant): Vue reactivity must never walk the connector's
 * internal catalog/Map. We track only the *replacement* of the connector, never its insides.
 *
 * `lastSyncAt` is the last successful drain time, written by the app's drain scheduler from the live sync
 * engine's `lastSyncedAt` (add-offline-and-sync) — `null` until the first drain ("Synced just now"). No
 * fake seed: the value reflects real sync. `searchQuery` / `viewMode` are the Library's transient view state.
 */
export const useLibraryStore = defineStore('library', () => {
  const connector = shallowRef<Connector | null>(null)
  const lastSyncAt = ref<number | null>(null)
  const searchQuery = ref('')
  const viewMode = ref<LibraryViewMode>('grid')

  function setConnector(next: Connector): void {
    connector.value = next
  }

  return { connector, lastSyncAt, searchQuery, viewMode, setConnector }
})
