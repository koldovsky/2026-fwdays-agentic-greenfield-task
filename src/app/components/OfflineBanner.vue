<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

// A slim, styled connectivity indicator (add-visual-polish-e2e ch11). Appears when the browser goes
// offline and hides when it returns — so the app never silently breaks online-only actions. Book
// reading keeps working offline (bytes are served from OPFS, bypassing the SW — ADR-005); this banner
// is the *visible* signal that sync/browse are paused. Connectivity is a web concern, so this lives in
// the app chrome (not core). Announced politely to assistive tech.
const offline = ref(false)

function update(): void {
  offline.value = typeof navigator !== 'undefined' && navigator.onLine === false
}

onMounted(() => {
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})

onUnmounted(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<template>
  <div
    v-if="offline"
    role="status"
    aria-live="polite"
    data-testid="offline-banner"
    class="flex items-center justify-center gap-2 border-b border-line bg-sunken px-4 py-2 text-sm text-ink"
  >
    <AppIcon name="bolt" :size="16" class="text-warning" />
    <span>You’re offline — downloaded books still open; syncing resumes when you reconnect.</span>
  </div>
</template>
