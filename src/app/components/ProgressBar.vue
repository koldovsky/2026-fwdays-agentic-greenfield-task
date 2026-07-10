<script setup lang="ts">
import { computed } from 'vue'

// Reading-progress bar — "Keep reading" cards (doc/web/01) and the progress card (doc/web/02).
// `value` is a percentage 0–100; the fill width tracks it (clamped).
const { value, label } = defineProps<{ value: number; label?: string }>()

const pct = computed(() => Math.max(0, Math.min(100, value)))
</script>

<template>
  <div
    class="h-1.5 w-full overflow-hidden rounded-pill bg-sunken"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="pct"
    :aria-label="label"
  >
    <div class="h-full rounded-pill bg-primary" :style="{ width: `${pct}%` }" />
  </div>
</template>
