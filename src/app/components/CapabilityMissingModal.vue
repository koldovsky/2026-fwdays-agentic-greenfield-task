<script setup lang="ts">
// Capability-missing prompt (doc/web/07) — the Observer end of the dispatch flow. It subscribes to the
// host EventBus's CapabilityMissing event (the dispatcher publishes it when an open needs a format that
// isn't currently ENABLED — never installed, OR installed but disabled on the Extensions screen; see
// audit cycle-1 P1 / core/registry) and renders the install prompt. The primary action installs (or, for
// an already-installed-but-disabled plugin, re-enables — cheap and instant, the chunk is already
// cached) via the registry (a first-party dynamic import(), NEVER a remote code download) then emits
// CapabilityInstalled so the parked reader retries the open. Copy is honest about which case it is —
// never says "isn't installed" for a plugin the user only turned off. "Not now — download the file
// instead" hands off to the raw download. Native <dialog> (showModal → top-layer + focus trap + Esc;
// closedby="any" light-dismiss with a click-outside fallback) per modern-web-guidance, mirroring
// AddSourceModal.
import { computed, markRaw, onMounted, onUnmounted, ref, toRaw } from 'vue'
import { PluginRegistry } from '@/core/registry'
import { formatLabel, type BookRef } from '@/core/model'
import {
  CAPABILITY_INSTALLED_EVENT,
  CAPABILITY_MISSING_EVENT,
  type CapabilityMissingPayload,
  type EddaEventBus,
} from '@/core/event-bus'
import { AppIcon, BaseButton } from '@/app/components'
import { appEventBus, appRegistry } from '@/app/app-registry'
import { displayVersion, extensionChips, formatPluginSize } from '@/app/extensions-presentation'

const props = defineProps<{
  registry?: PluginRegistry
  eventBus?: EddaEventBus
  /** How a declined/raw-file request is satisfied (App.vue wires the offline-download path). */
  onDownload?: (bookRef: BookRef) => void | Promise<void>
}>()

// Imperative singletons with private fields — never let Vue's reactive proxy wrap them (ADR-001).
const registry = markRaw(toRaw(props.registry) ?? appRegistry())
const eventBus = markRaw(toRaw(props.eventBus) ?? appEventBus())

const dialogEl = ref<HTMLDialogElement | null>(null)
const active = ref<CapabilityMissingPayload | null>(null)
const installing = ref(false)
const installError = ref<string | null>(null)

// A capability can be missing for two honestly-different reasons (audit cycle-1 P1): the format was
// NEVER installed, or it WAS installed and the user disabled it on the Extensions screen. The copy must
// say which one it is — re-enabling an already-installed plugin is not "installing" it.
const reenabling = computed(
  () => active.value !== null && registry.isInstalled(active.value.suggestion.id),
)

let unsubscribe: (() => void) | null = null

function syncDialog(open: boolean): void {
  const el = dialogEl.value
  if (!el) return
  if (open && !el.open) {
    try {
      el.showModal()
    } catch {
      el.setAttribute('open', '') // jsdom / no showModal — fall back so content renders.
    }
  } else if (!open && el.open) {
    try {
      el.close()
    } catch {
      el.removeAttribute('open')
    }
  }
}

function present(payload: CapabilityMissingPayload): void {
  active.value = payload
  installError.value = null
  installing.value = false
  void Promise.resolve().then(() => syncDialog(true))
}

function dismiss(): void {
  syncDialog(false)
  active.value = null
}

async function onInstall(): Promise<void> {
  const payload = active.value
  if (!payload || installing.value) return
  installing.value = true
  installError.value = null
  try {
    // "Install" = a first-party dynamic import() via the registry, never a remote code fetch (ADR-010).
    await registry.install(payload.suggestion.id)
    // Tell the parked reader to retry the original open (DESIGN §8.1 retry-after-install).
    eventBus.emit(CAPABILITY_INSTALLED_EVENT, {
      bookRef: payload.bookRef,
      pluginId: payload.suggestion.id,
    })
    dismiss()
  } catch (error) {
    installError.value =
      error instanceof Error ? error.message : 'Could not install this extension.'
  } finally {
    installing.value = false
  }
}

async function onDecline(): Promise<void> {
  const payload = active.value
  if (!payload) return
  // Never install, never open: offer the raw file download instead (DESIGN §8.1 degradation).
  await props.onDownload?.(payload.bookRef)
  dismiss()
}

onMounted(() => {
  const el = dialogEl.value
  // Light-dismiss fallback for browsers without <dialog closedby> (e.g. Safari): a backdrop click has
  // the dialog itself as target. Treated as a decline (download), matching the secondary action.
  if (el && !('closedBy' in HTMLDialogElement.prototype)) {
    el.addEventListener('click', (event) => {
      if (event.target === el) void onDecline()
    })
  }
  unsubscribe = eventBus.on(CAPABILITY_MISSING_EVENT, present)
})

onUnmounted(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>

<template>
  <dialog
    ref="dialogEl"
    closedby="any"
    aria-labelledby="capability-missing-title"
    class="capability-dialog m-auto w-[min(28rem,92vw)] rounded-card bg-surface p-0 text-ink shadow-card"
    data-testid="capability-missing-modal"
    @close="dismiss"
  >
    <div v-if="active" class="flex flex-col items-center px-8 pt-8 pb-7 text-center">
      <!-- Format glyph + extension badge -->
      <div class="relative mb-5">
        <span
          class="flex size-16 items-center justify-center rounded-card bg-sunken font-mono text-sm font-semibold text-muted"
        >
          {{ formatLabel(active.bookRef.mediaType) }}
        </span>
        <span
          class="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full bg-primary text-on-primary"
        >
          <AppIcon name="extensions" :size="14" />
        </span>
      </div>

      <h2 id="capability-missing-title" class="font-display text-2xl text-ink">
        {{
          reenabling
            ? `Turn ${active.suggestion.name} back on?`
            : `Install ${active.suggestion.name}?`
        }}
      </h2>
      <p class="mt-3 text-sm leading-relaxed text-muted" data-testid="capability-body">
        <template v-if="reenabling">
          “{{ active.bookRef.title }}” is a {{ formatLabel(active.bookRef.mediaType) }}, and
          {{ active.suggestion.name }} is currently turned off. Turn it back on and Edda will open
          the book right away.
        </template>
        <template v-else>
          “{{ active.bookRef.title }}” is a {{ formatLabel(active.bookRef.mediaType) }}, and that
          format isn’t installed yet. Add it and Edda will open the book right away — and use it
          automatically from now on.
        </template>
      </p>

      <!-- Plugin card -->
      <div class="mt-5 w-full rounded-card border border-line bg-canvas/60 p-4 text-left">
        <div class="flex items-center gap-3">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken font-mono text-[0.65rem] font-semibold text-muted"
          >
            {{ formatLabel(active.bookRef.mediaType) }}
          </span>
          <div class="min-w-0">
            <p class="font-display text-base leading-tight text-ink">
              {{ active.suggestion.name }}
            </p>
            <p class="font-mono text-xs text-muted" data-testid="capability-card-id">
              {{ active.suggestion.id }} · {{ displayVersion(active.suggestion.version) }} ·
              {{ formatPluginSize(active.suggestion.approxSizeKB) }}
            </p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span v-for="chip in extensionChips(active.suggestion)" :key="chip">{{ chip }}</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-sm">
          <span class="flex items-center gap-1.5 text-status">
            <AppIcon name="check" :size="15" />
            No network access
          </span>
          <span class="flex items-center gap-1.5 text-muted">
            <AppIcon name="shield" :size="15" />
            Runs sandboxed
          </span>
        </div>
      </div>

      <p v-if="installError" class="mt-3 text-sm text-warning">{{ installError }}</p>

      <BaseButton
        variant="primary"
        type="button"
        icon="download"
        class="mt-5 w-full"
        :disabled="installing"
        data-testid="capability-install"
        @click="onInstall"
      >
        {{
          installing
            ? reenabling
              ? 'Turning on…'
              : 'Installing…'
            : reenabling
              ? 'Turn on & open'
              : 'Install & open'
        }}
      </BaseButton>

      <button
        type="button"
        class="tap-target mt-4 text-sm text-muted transition-colors hover:text-ink"
        data-testid="capability-decline"
        @click="onDecline"
      >
        Not now — download the file instead
      </button>

      <p class="mt-4 font-mono text-[0.7rem] text-muted">
        {{
          reenabling
            ? 'first-party extension · turns back on instantly, then retries open'
            : 'first-party extension · installs in ~2s, then retries open'
        }}
      </p>
    </div>
  </dialog>
</template>

<style scoped>
/* Dim, slightly-blurred parchment backdrop (the maket darkens the reader behind the prompt). */
.capability-dialog::backdrop {
  background-color: rgb(44 42 37 / 0.5);
  backdrop-filter: blur(3px);
}
</style>
