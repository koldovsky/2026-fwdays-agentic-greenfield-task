<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration, progressFraction, type ProgressSnapshot } from '@/core/model'
import { AppIcon, BaseCard, ProgressBar } from '@/app/components'

// The "YOUR PROGRESS" card (doc/web/02) for the book's CURRENT format: a large percentage + bar from the
// locator's totalProgression, a derived "about 1h 12m left", and a "Last read … on …" line. No saved
// position ⇒ a not-started / 0% state (degrades gracefully before the sync engine, add-offline-and-sync).
const { snapshot } = defineProps<{ snapshot?: ProgressSnapshot }>()

const percent = computed(() => (snapshot ? Math.round(progressFraction(snapshot) * 100) : 0))

const timeLeft = computed(() => {
  const minutes = snapshot?.minutesLeft
  return minutes !== undefined && minutes > 0 ? `about ${formatDuration(minutes)} left` : ''
})

const lastRead = computed(() => {
  const at = snapshot?.lastReadAt
  if (!at) return ''
  const when = relativeAgo(at, Date.now())
  return snapshot?.lastReadDevice
    ? `Last read ${when} on ${snapshot.lastReadDevice}`
    : `Last read ${when}`
})

/** Presentation-only relative phrase ("2h ago"); `now` is injected so it stays deterministic in tests. */
function relativeAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / (60 * 24))}d ago`
}
</script>

<template>
  <BaseCard>
    <p class="font-mono text-xs tracking-wider text-muted uppercase">Your progress</p>
    <div class="mt-2 flex items-baseline gap-3">
      <span class="font-display text-4xl leading-none text-ink">{{ percent }}%</span>
      <span v-if="timeLeft" class="text-sm text-muted">{{ timeLeft }}</span>
      <span v-else-if="percent === 0" class="text-sm text-muted">not started yet</span>
    </div>
    <ProgressBar :value="percent" :label="`${percent}% read`" class="mt-4" />
    <p v-if="lastRead" class="mt-3 flex items-center gap-1.5 text-sm text-muted">
      <AppIcon name="phone" :size="14" />
      {{ lastRead }}
    </p>
  </BaseCard>
</template>
