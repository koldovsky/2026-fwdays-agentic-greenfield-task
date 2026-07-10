<script setup lang="ts">
import { ref } from 'vue'
import { AppIcon, BaseButton } from '@/app/components'

// The action stack beneath the cover (doc/web/02): a primary "Continue reading" (the reader entry point),
// an "Offline" download, and a bookmark toggle. "Continue reading" reads "Start reading" when there is no
// saved position. The Offline control reflects the offline-storage registry (add-offline-and-sync): it
// downloads the book to OPFS when tapped, shows "Downloading…" in flight, and a checked "Available offline"
// indicator once cached. The bookmark toggle flips a local, on-device flag.
const {
  hasProgress,
  offlineAvailable = false,
  downloading = false,
} = defineProps<{ hasProgress: boolean; offlineAvailable?: boolean; downloading?: boolean }>()
const emit = defineEmits<{ continue: []; offline: [] }>()

const bookmarked = ref(false)
</script>

<template>
  <div class="flex flex-col gap-3">
    <BaseButton variant="primary" icon="book-open" class="w-full" @click="emit('continue')">
      {{ hasProgress ? 'Continue reading' : 'Start reading' }}
    </BaseButton>

    <div class="flex gap-3">
      <!-- Offline state: available (checked indicator) · downloading · idle (tap to download). -->
      <span
        v-if="offlineAvailable"
        class="inline-flex flex-1 items-center justify-center gap-2 rounded-control border border-line bg-active px-3 py-2 text-sm text-primary"
        data-testid="offline-available"
      >
        <AppIcon name="check" :size="18" />
        Available offline
      </span>
      <BaseButton
        v-else
        variant="secondary"
        icon="download"
        class="flex-1"
        :disabled="downloading"
        @click="emit('offline')"
      >
        {{ downloading ? 'Downloading…' : 'Offline' }}
      </BaseButton>
      <button
        type="button"
        class="tap-target inline-flex items-center justify-center rounded-control border border-line bg-surface px-3 text-ink transition-colors hover:bg-sunken"
        :class="bookmarked ? 'text-primary' : ''"
        :aria-pressed="bookmarked"
        :aria-label="bookmarked ? 'Remove bookmark' : 'Add bookmark'"
        @click="bookmarked = !bookmarked"
      >
        <AppIcon name="bookmark" :size="18" />
      </button>
    </div>
  </div>
</template>
