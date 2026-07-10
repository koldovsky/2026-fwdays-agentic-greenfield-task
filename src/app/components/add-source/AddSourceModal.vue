<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { DetectedServer, ProberOutcome } from '@/core/dispatch'
import { AppIcon, BaseButton, BaseCard, BaseChip, BaseStepper } from '@/app/components'
import {
  capabilityChips,
  probeServer,
  protocolSummary,
  toDisplayConnectorId,
} from '@/app/add-source'
import { useSourcesStore } from '@/app/stores/sourcesStore'

// "Add a source" modal — screen 05 (doc/web/05-add-source-desktop.png). A native <dialog> (showModal
// for top-layer + focus trap + Esc dismiss; closedby="any" light-dismiss with a click-outside fallback
// per modern-web-guidance). Progressive reveal, not a hiding wizard: the address field probes (debounced)
// → on a reachable detection the stepper advances to "Detected", the detected card + capability chips +
// sign-in fields appear. Connect persists the source on-device (credentials separated — see sourcesStore).

const { open } = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; connected: [] }>()

const sourcesStore = useSourcesStore()

const STEPS = ['Address', 'Detected', 'Sign in']
const PROBE_DEBOUNCE_MS = 300

const dialogEl = ref<HTMLDialogElement | null>(null)
const url = ref('')
const username = ref('')
const password = ref('')
const probing = ref(false)
const outcome = ref<ProberOutcome | null>(null)
const connecting = ref(false)
const connectError = ref<string | null>(null)
const installNote = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let probeToken = 0

const detected = computed<DetectedServer | null>(() => {
  const result = outcome.value
  return result && (result.status === 'ready' || result.status === 'installable')
    ? result.detected
    : null
})
const isReady = computed(() => outcome.value?.status === 'ready')
const isInstallable = computed(() => outcome.value?.status === 'installable')
const reachable = computed(() => !!outcome.value && outcome.value.status !== 'unreachable')
const unreachable = computed(() => outcome.value?.status === 'unreachable')
const currentStep = computed(() => (detected.value ? 2 : 1))
const chips = computed(() => (detected.value ? capabilityChips(detected.value.capabilities) : []))
const displayId = computed(() =>
  detected.value ? toDisplayConnectorId(detected.value.connectorId) : '',
)
const summary = computed(() => (detected.value ? protocolSummary(detected.value.capabilities) : ''))
const requiresCredentials = computed(
  () => !!detected.value && !detected.value.capabilities.auth.includes('none'),
)
const canConnect = computed(
  () =>
    isReady.value &&
    !connecting.value &&
    (!requiresCredentials.value || (username.value.trim().length > 0 && password.value.length > 0)),
)

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

async function runProbe(raw: string): Promise<void> {
  const target = normalizeUrl(raw)
  if (target === '') {
    outcome.value = null
    probing.value = false
    return
  }
  const token = ++probeToken
  probing.value = true
  try {
    const result = await probeServer(target)
    if (token === probeToken) outcome.value = result
  } catch {
    if (token === probeToken) {
      outcome.value = { status: 'unreachable', reason: 'Could not reach this address.' }
    }
  } finally {
    if (token === probeToken) probing.value = false
  }
}

watch(url, (value) => {
  // A new address invalidates any prior detection; re-probe after the user pauses typing.
  outcome.value = null
  connectError.value = null
  installNote.value = null
  if (debounceTimer) clearTimeout(debounceTimer)
  if (value.trim() === '') {
    probing.value = false
    return
  }
  probing.value = true
  debounceTimer = setTimeout(() => void runProbe(value), PROBE_DEBOUNCE_MS)
})

async function onConnect(): Promise<void> {
  const result = outcome.value
  if (!result || result.status !== 'ready') return
  connecting.value = true
  connectError.value = null
  try {
    await sourcesStore.connect({
      detected: result.detected,
      baseUrl: normalizeUrl(url.value),
      username: username.value,
      password: password.value,
    })
    emit('connected')
  } catch (error) {
    connectError.value =
      error instanceof Error ? error.message : 'Could not connect to this source.'
  } finally {
    connecting.value = false
  }
}

function requestClose(): void {
  emit('close')
}

function resetForm(): void {
  url.value = ''
  username.value = ''
  password.value = ''
  outcome.value = null
  probing.value = false
  connecting.value = false
  connectError.value = null
  installNote.value = null
}

function syncDialog(): void {
  const el = dialogEl.value
  if (!el) return
  if (open && !el.open) {
    try {
      el.showModal()
    } catch {
      // jsdom / environments without showModal — fall back to the open attribute so content renders.
      el.setAttribute('open', '')
    }
  } else if (!open && el.open) {
    try {
      el.close()
    } catch {
      el.removeAttribute('open')
    }
  }
}

watch(
  () => open,
  (isOpen) => {
    if (isOpen) resetForm()
    void nextTick(syncDialog)
  },
)

onMounted(() => {
  const el = dialogEl.value
  // Light-dismiss fallback for browsers without <dialog closedby> (e.g. Safari): a click landing on the
  // backdrop has the dialog itself as target. Modern browsers use closedby="any" (handled via @close).
  if (el && !('closedBy' in HTMLDialogElement.prototype)) {
    el.addEventListener('click', (event) => {
      if (event.target === el) requestClose()
    })
  }
  if (open) {
    resetForm()
    syncDialog()
  }
})

onBeforeUnmount(() => {
  // Drop any pending debounced probe so it can't fire (and call probeServer) after the modal is gone.
  if (debounceTimer) clearTimeout(debounceTimer)
  probeToken++
})
</script>

<template>
  <dialog
    ref="dialogEl"
    closedby="any"
    aria-labelledby="add-source-title"
    class="add-source-dialog m-auto w-[min(36rem,92vw)] rounded-card bg-surface p-0 text-ink shadow-card"
    @close="requestClose"
  >
    <form class="flex flex-col" @submit.prevent="onConnect">
      <!-- Header -->
      <header class="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id="add-source-title" class="font-display text-2xl text-ink">Add a source</h2>
          <p class="mt-1 text-sm text-muted">
            Connect a server or paste an OPDS feed — we detect the rest.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          class="tap-target flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted transition-colors hover:text-ink"
          @click="requestClose"
        >
          <AppIcon name="close" :size="18" />
        </button>
      </header>

      <!-- Stepper -->
      <div class="px-6 pt-5">
        <BaseStepper :steps="STEPS" :current="currentStep" />
      </div>

      <!-- Body -->
      <div class="flex flex-col gap-5 px-6 pt-5">
        <!-- SERVER ADDRESS -->
        <section>
          <label
            for="add-source-url"
            class="mb-2 block font-mono text-xs tracking-wider text-muted uppercase"
          >
            Server address
          </label>
          <div
            class="flex items-center gap-2.5 rounded-control border bg-surface px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-primary/40"
            :class="reachable ? 'border-status' : 'border-line focus-within:border-primary'"
          >
            <AppIcon name="link" :size="18" class="shrink-0 text-muted" />
            <input
              id="add-source-url"
              v-model="url"
              type="url"
              inputmode="url"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              autofocus
              placeholder="https://komga.myhome.net"
              class="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none placeholder:text-muted"
            />
            <span
              v-if="reachable"
              class="flex shrink-0 items-center gap-1 text-sm text-status"
              data-testid="reachable"
            >
              <AppIcon name="check" :size="16" />
              Reachable
            </span>
            <span v-else-if="probing" class="shrink-0 text-sm text-muted">Checking…</span>
            <span v-else-if="unreachable" class="shrink-0 text-sm text-warning">Not reachable</span>
          </div>
          <p v-if="unreachable" class="mt-2 text-sm text-muted">
            {{ outcome && outcome.status === 'unreachable' ? outcome.reason : '' }}
          </p>
        </section>

        <!-- Detected-server card + CAPABILITIES -->
        <section v-if="detected">
          <BaseCard>
            <div class="flex items-start gap-3">
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-control bg-active text-primary"
              >
                <AppIcon name="server" :size="22" />
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="font-display text-lg leading-tight text-ink">
                  {{ detected.manifest.name }} server
                </h3>
                <p class="mt-0.5 font-mono text-xs break-words text-muted">
                  {{ displayId }} · {{ detected.manifest.bundled ? 'bundled' : 'installable' }} ·
                  {{ summary }}
                </p>
              </div>
              <span
                v-if="isReady"
                class="flex shrink-0 items-center gap-1.5 rounded-pill bg-active px-3 py-1 text-sm text-primary"
                data-testid="adapter-ready"
              >
                <AppIcon name="check" :size="15" />
                Adapter ready
              </span>
              <BaseButton
                v-else-if="isInstallable"
                variant="secondary"
                type="button"
                @click="
                  installNote = `Installing ${detected.manifest.name} arrives with Extensions.`
                "
              >
                Install {{ detected.manifest.name }}
              </BaseButton>
            </div>

            <p
              v-if="installNote"
              class="mt-3 rounded-control bg-sunken px-3 py-2 text-sm text-muted"
            >
              {{ installNote }}
            </p>

            <p class="mt-4 mb-2 font-mono text-xs tracking-wider text-muted uppercase">
              Capabilities
            </p>
            <div class="flex flex-wrap gap-2">
              <BaseChip
                v-for="chip in chips"
                :key="chip.label"
                :variant="chip.kind === 'feature' ? 'capability' : 'neutral'"
              >
                <span :class="chip.kind === 'protocol' ? 'font-mono text-xs' : ''">{{
                  chip.label
                }}</span>
              </BaseChip>
            </div>
          </BaseCard>
        </section>

        <!-- Sign in -->
        <section v-if="detected" class="grid grid-cols-2 gap-4">
          <div>
            <label
              for="add-source-username"
              class="mb-2 block font-mono text-xs tracking-wider text-muted uppercase"
            >
              Username
            </label>
            <input
              id="add-source-username"
              v-model="username"
              type="text"
              autocomplete="username"
              class="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div>
            <label
              for="add-source-password"
              class="mb-2 block font-mono text-xs tracking-wider text-muted uppercase"
            >
              Password
            </label>
            <input
              id="add-source-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
        </section>

        <p v-if="connectError" class="text-sm text-warning">{{ connectError }}</p>
      </div>

      <!-- Footer -->
      <footer class="mt-6 flex items-center justify-between gap-4 border-t border-line px-6 py-4">
        <span class="flex items-center gap-2 text-sm text-muted">
          <AppIcon name="shield" :size="16" />
          Credentials stored on this device only
        </span>
        <div class="flex items-center gap-2">
          <BaseButton variant="secondary" type="button" @click="requestClose">Cancel</BaseButton>
          <BaseButton variant="primary" type="submit" icon="bolt" :disabled="!canConnect">
            Connect
          </BaseButton>
        </div>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
/* Dim, slightly-blurred parchment backdrop (the maket shows the library darkened behind the modal). */
.add-source-dialog::backdrop {
  background-color: rgb(44 42 37 / 0.45);
  backdrop-filter: blur(2px);
}
</style>
