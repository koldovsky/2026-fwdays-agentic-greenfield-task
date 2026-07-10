<script setup lang="ts">
// Extensions screen (doc/web/06) — the plugin registry made visible. INSTALLED lists every INSTALLED
// plugin — bundled connectors/formats plus anything the user has installed on demand — REGARDLESS of
// whether it's currently enabled: an installed-but-disabled plugin stays here, rendered with its toggle
// off, with its monospace `id · version`, capability chips, a BUNDLED tag (if applicable), and the
// toggle itself. AVAILABLE lists only plugins that have NEVER been installed (the install-on-demand
// catalog, e.g. PDF before its first install). Install = a first-party dynamic `import()` via the
// registry (never a network code fetch). Toggling a plugin OFF disables it (registry.disable) — that is
// reversible and never an uninstall, so the row must never move back down to Available (audit cycle-1
// P1: `installed()`/`available()` now key off "ever installed", not "currently enabled" — see
// core/registry). Bundled toggles are non-interactive: the registry REFUSES to disable a bundled
// plugin (load-bearing), and the toggle reflects that.
import { computed, markRaw, ref, toRaw } from 'vue'
import { HOST_API_VERSION, type PluginManifest } from '@/core/contracts'
import { PluginRegistry } from '@/core/registry'
import {
  AppIcon,
  BaseButton,
  BaseCard,
  BaseChip,
  BaseToggle,
  type IconName,
} from '@/app/components'
import { appRegistry } from '@/app/app-registry'
import { PDF_MANIFEST } from '@/app/plugins-catalog'
import {
  advisoryNote,
  displayVersion,
  extensionChips,
  formatPluginSize,
} from '@/app/extensions-presentation'

const props = defineProps<{ registry?: PluginRegistry }>()
// The registry is an imperative object with private fields — Vue's reactive prop proxy would break
// `#private` access (ADR-001, the same rule as the renderer). Hold the RAW instance, never the proxy.
const registry = markRaw(toRaw(props.registry) ?? appRegistry())

const installing = ref<Set<string>>(new Set())
const installNotes = ref<Record<string, string>>({})

// The registry is a plain (non-reactive) imperative object, so a `version` counter — bumped on every
// install/toggle — is what drives recomputation of the installed/available lists from it.
const version = ref(0)
const installed = computed<PluginManifest[]>(() => {
  void version.value
  return registry.installed()
})
const available = computed<PluginManifest[]>(() => {
  void version.value
  return registry.available()
})
function refresh(): void {
  version.value += 1
}

const installedCount = computed(() => installed.value.length)
const hostApiLabel = computed(
  () => `Host API v${HOST_API_VERSION.split('.').slice(0, 2).join('.')}`,
)

const GLYPHS: Readonly<Record<string, IconName>> = {
  'connector.opds': 'sync',
  'connector.komga': 'server',
  'format.epub': 'book-open',
  'format.pdf': 'book-open',
}
function glyphFor(id: string): IconName {
  return GLYPHS[id] ?? 'extensions'
}

const isBundled = (manifest: PluginManifest): boolean => registry.isBundled(manifest.id)
const isInstalling = (manifest: PluginManifest): boolean => installing.value.has(manifest.id)
const isNextUp = (manifest: PluginManifest): boolean => manifest.id === PDF_MANIFEST.id

async function onInstall(manifest: PluginManifest): Promise<void> {
  if (isInstalling(manifest)) return
  installNotes.value = { ...installNotes.value, [manifest.id]: '' }
  installing.value = new Set(installing.value).add(manifest.id)
  try {
    // "Install" = a first-party dynamic import() via the registry — NEVER a remote code download.
    await registry.install(manifest.id)
    refresh()
  } catch {
    // A real install failure (a host-API mismatch, a chunk that failed to load). Surface it plainly —
    // never mask it. Every catalogued plugin has a real handler now, so there is no "coming soon" state.
    installNotes.value = {
      ...installNotes.value,
      [manifest.id]: 'Install failed — try again',
    }
  } finally {
    const next = new Set(installing.value)
    next.delete(manifest.id)
    installing.value = next
  }
}

function onToggle(manifest: PluginManifest, enabled: boolean): void {
  // Bundled plugins are always-on; the registry refuses disable and the toggle is non-interactive.
  if (isBundled(manifest)) return
  try {
    if (enabled) registry.enable(manifest.id)
    else registry.disable(manifest.id)
  } catch {
    // A refused disable (bundled) leaves state unchanged.
  }
  refresh()
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-8 py-10" data-testid="extensions-screen">
    <p class="mb-3 font-mono text-xs tracking-wide text-muted">
      edda.local / settings / extensions
    </p>

    <header class="flex items-start justify-between gap-6">
      <div class="max-w-2xl">
        <h1 class="font-display text-4xl text-ink">Extensions</h1>
        <p class="mt-2 text-muted">
          Connectors talk to your servers; formats open your books. Bundled ones ship in the app —
          install the rest on demand.
        </p>
      </div>
      <span
        class="shrink-0 rounded-pill border border-line bg-surface px-3 py-1.5 font-mono text-xs text-muted"
        data-testid="host-api-pill"
      >
        {{ hostApiLabel }}
      </span>
    </header>

    <!-- INSTALLED -->
    <h2
      class="mt-8 mb-3 font-mono text-xs tracking-wider text-muted uppercase"
      data-testid="installed-heading"
    >
      Installed · {{ installedCount }}
    </h2>
    <ul class="flex flex-col gap-3" data-testid="installed-section">
      <li v-for="manifest in installed" :key="manifest.id" :data-testid="`ext-row-${manifest.id}`">
        <BaseCard>
          <div class="flex items-center gap-4">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-control bg-active text-primary"
            >
              <AppIcon :name="glyphFor(manifest.id)" :size="22" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 class="font-display text-lg leading-tight text-ink">{{ manifest.name }}</h3>
                <span class="font-mono text-xs text-muted">
                  {{ manifest.id }} · {{ displayVersion(manifest.version) }}
                </span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <BaseChip
                  v-for="chip in extensionChips(manifest)"
                  :key="chip"
                  :label="chip"
                  variant="neutral"
                />
              </div>
            </div>
            <span
              v-if="isBundled(manifest)"
              class="shrink-0 rounded-pill bg-sunken px-2.5 py-1 font-mono text-[0.65rem] tracking-wider text-muted uppercase"
              data-testid="bundled-tag"
            >
              Bundled
            </span>
            <BaseToggle
              :model-value="registry.isEnabled(manifest.id)"
              :disabled="isBundled(manifest)"
              :label="`Enable ${manifest.name}`"
              :data-testid="`toggle-${manifest.id}`"
              @update:model-value="(value) => onToggle(manifest, value)"
            />
          </div>
        </BaseCard>
      </li>
    </ul>

    <!-- AVAILABLE -->
    <h2 class="mt-10 mb-3 font-mono text-xs tracking-wider text-muted uppercase">Available</h2>
    <ul class="grid gap-3 sm:grid-cols-2" data-testid="available-section">
      <li v-for="manifest in available" :key="manifest.id" :data-testid="`avail-${manifest.id}`">
        <BaseCard>
          <div class="flex items-center gap-4">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-control bg-sunken text-muted"
            >
              <AppIcon :name="glyphFor(manifest.id)" :size="22" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-display text-lg leading-tight text-ink">{{ manifest.name }}</h3>
                <span
                  v-if="isNextUp(manifest)"
                  class="rounded-pill bg-active px-2 py-0.5 font-mono text-[0.65rem] tracking-wider text-primary uppercase"
                  data-testid="next-up-tag"
                >
                  Next up
                </span>
                <span
                  v-if="advisoryNote(manifest)"
                  class="font-mono text-[0.7rem] text-warning"
                  data-testid="advisory-note"
                >
                  {{ advisoryNote(manifest) }}
                </span>
              </div>
              <p class="mt-1 font-mono text-xs text-muted">
                {{ manifest.id }} · {{ formatPluginSize(manifest.approxSizeKB) }}
              </p>
              <p
                v-if="installNotes[manifest.id]"
                class="mt-1 text-xs text-muted"
                :data-testid="`install-note-${manifest.id}`"
              >
                {{ installNotes[manifest.id] }}
              </p>
            </div>
            <BaseButton
              :variant="isNextUp(manifest) ? 'primary' : 'secondary'"
              :icon="isNextUp(manifest) ? 'download' : undefined"
              :disabled="isInstalling(manifest)"
              :data-testid="`install-${manifest.id}`"
              @click="onInstall(manifest)"
            >
              {{ isInstalling(manifest) ? 'Installing…' : 'Install' }}
            </BaseButton>
          </div>
        </BaseCard>
      </li>
    </ul>

    <!-- Assurance footer -->
    <div
      class="mt-10 flex max-w-md items-start gap-3 rounded-card bg-sunken/60 p-4"
      data-testid="assurance-footer"
    >
      <AppIcon name="shield" :size="18" class="mt-0.5 shrink-0 text-primary" />
      <div>
        <p class="text-sm font-medium text-ink">First-party &amp; sandboxed</p>
        <p class="mt-0.5 text-xs text-muted">
          Every extension talks only to the host bridge — no page, no other plugin's data.
        </p>
      </div>
    </div>
  </section>
</template>
