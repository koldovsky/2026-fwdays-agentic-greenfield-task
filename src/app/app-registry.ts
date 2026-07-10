// The single app-wide PluginRegistry, host EventBus, and CapabilityDispatcher. It registers the
// first-party catalogue the Extensions screen renders — OPDS + Komga (bundled connectors), EPUB
// (bundled format), and the install-on-demand PDF — enables the BUNDLED plugins (always-on), and
// rehydrates the persisted enabled set from localStorage. Only plugins with a real runtime handler are
// catalogued (no vapour stubs). PDF stays AVAILABLE until the user installs it through the
// capability-missing flow (change 10). Komga's per-source connector is still built by the add-source
// connect flow (createConnectorFor) with the user's config; the registry holds Komga only as its
// bundled manifest row.

import { markRaw } from 'vue'
import { CapabilityDispatcher } from '@/core/dispatch'
import { type EddaEventBus, type EddaEvents, SimpleEventBus } from '@/core/event-bus'
import { type EnabledSetStore, PluginRegistry } from '@/core/registry'
import { WebEnabledSetStore } from '@/platform/web'
import {
  EPUB_MANIFEST,
  KOMGA_MANIFEST,
  OPDS_MANIFEST,
  registerDefaultConnectorCatalog,
  registerDefaultFormats,
} from '@/app/plugins-catalog'

/** Bundled, always-on plugins — enabled at startup and refused disable by the registry (load-bearing). */
const BUNDLED_ENABLED_IDS = [OPDS_MANIFEST.id, KOMGA_MANIFEST.id, EPUB_MANIFEST.id]

/** Build a fresh registry with the full catalogue, persisting the enabled AND installed sets via
 *  `enabledStore`/`installedStore` (durable, separately-keyed localStorage by default; tests inject
 *  in-memory stores for hermetic runs). Exported for tests; the app uses the {@link appRegistry}
 *  singleton. */
export function createAppRegistry(
  enabledStore: EnabledSetStore = new WebEnabledSetStore(),
  installedStore: EnabledSetStore = new WebEnabledSetStore('edda.plugins.installed'),
): PluginRegistry {
  const registry = new PluginRegistry({ enabledStore, installedStore })
  registerDefaultConnectorCatalog(registry) // OPDS + Komga (bundled connectors)
  registerDefaultFormats(registry) // EPUB (bundled) · PDF (install-on-demand)
  registry.rehydrate()
  // Bundled plugins are always-on: enable any the persisted set doesn't already carry. PDF is NOT
  // auto-enabled — it ships AVAILABLE and is installed on demand (screen 07 / the Extensions screen).
  for (const id of BUNDLED_ENABLED_IDS) {
    if (!registry.isEnabled(id)) registry.enable(id)
  }
  // markRaw the imperative registry: it has `#private` fields Vue's reactive proxy cannot forward
  // (ADR-001). Marking it raw means a component that receives it (e.g. as a prop) never wraps it.
  return markRaw(registry)
}

let instance: PluginRegistry | null = null

/** The lazily-created process-wide registry (no side effects at import; built on first access). */
export function appRegistry(): PluginRegistry {
  if (!instance) instance = createAppRegistry()
  return instance
}

let busInstance: EddaEventBus | null = null

/** The process-wide host event bus — the Observer channel the dispatcher publishes CapabilityMissing on. */
export function appEventBus(): EddaEventBus {
  if (!busInstance) busInstance = markRaw(new SimpleEventBus<EddaEvents>())
  return busInstance
}

let dispatcherInstance: CapabilityDispatcher | null = null

/** The process-wide capability dispatcher, wired to the app registry + event bus. */
export function appDispatcher(): CapabilityDispatcher {
  if (!dispatcherInstance) {
    dispatcherInstance = markRaw(new CapabilityDispatcher(appRegistry(), appEventBus()))
  }
  return dispatcherInstance
}
