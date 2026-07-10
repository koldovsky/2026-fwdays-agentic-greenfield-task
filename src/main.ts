import { createApp, markRaw } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import App from '@/app/App.vue'
import { router } from '@/app/router'
import { appRegistry } from '@/app/app-registry'
import { useLibraryStore } from '@/app/stores/libraryStore'
import { useSourcesStore } from '@/app/stores/sourcesStore'
import { useDownloadsStore } from '@/app/stores/downloadsStore'
import { syncEngine } from '@/app/sync'
import { scheduleDrains } from '@/platform/web'
import FixtureConnector from '@/plugins/connectors/fixture'

// Self-hosted display (Newsreader) + reading (Literata) faces, Latin subset, only the weights
// the chrome uses — bundled by Vite (no CDN) so the PWA renders them offline. font-display: swap.
import '@fontsource/newsreader/latin-500.css'
import '@fontsource/newsreader/latin-600.css'
import '@fontsource/literata/latin-400.css'
import '@fontsource/literata/latin-500.css'

import '@/app/styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(PiniaColada).use(router)

// Wire the plugin registry in for the first time: persisted enabled set + the bundled OPDS fallback
// registered & enabled (add-source-flow). add-extensions-and-capability-install builds the UX on top.
appRegistry()

// Restore any persisted sources before mount: a connected real server becomes the live Library
// connector (rehydrate is async). With NO persisted source the Library has no connector and renders its
// "Connect a source" empty state — Edda shows real server data only, never a built-in demo catalog.
//
// The in-memory FixtureConnector survives ONLY as an OPT-IN seed for tests: the e2e/visual suite sets
// `localStorage['edda.seed'] = 'fixture'` (before load) so the maket screens render deterministically
// without a server. Production never sets that flag, so a real user never sees demo books.
const library = useLibraryStore(pinia)
if (localStorage.getItem('edda.seed') === 'fixture') {
  library.setConnector(markRaw(new FixtureConnector()))
}
void useSourcesStore(pinia).rehydrate()

// Offline + sync (add-offline-and-sync): hydrate the download registry (drives the badge / counts), then
// schedule outbox drains on reconnect / app focus. The scheduler reads the ACTIVE connector's strategy each
// time (connector-agnostic) and mirrors the engine's last-drain time onto the store for "Synced Xm ago".
void useDownloadsStore(pinia).hydrate()
const engine = syncEngine()
const scheduler = scheduleDrains(engine, () => library.connector?.progressStrategy() ?? null, {
  onDrained: () => {
    library.lastSyncAt = engine.lastSyncedAt
  },
})
// Flush reading progress to the server WHILE the book is open: each enqueued position (a page turn)
// schedules a debounced drain. Without this, queued progress only reaches the server on the next
// reconnect / focus / reload — so a user who reads then switches to Komga sees no progress there.
engine.onEnqueue(() => scheduler.trigger())
// Kick an initial drain so progress queued in a previous session reconciles on load (online + a source).
scheduler.trigger()

app.mount('#app')
