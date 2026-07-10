<script setup lang="ts">
// Small status indicator dot — used beside connected sources in the sidebar (doc/web/01).
export type StatusTone = 'connected' | 'warning' | 'muted'

const { tone = 'connected', label } = defineProps<{ tone?: StatusTone; label?: string }>()

const TONE_CLASS: Record<StatusTone, string> = {
  connected: 'bg-status',
  warning: 'bg-warning',
  muted: 'bg-muted',
}
</script>

<template>
  <span
    class="inline-block size-2 shrink-0 rounded-full"
    :class="TONE_CLASS[tone]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  />
</template>
