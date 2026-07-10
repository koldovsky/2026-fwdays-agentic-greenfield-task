<script setup lang="ts">
// Raised surface card — the "Keep reading" cards (doc/web/01), the progress / extension panels
// (doc/web/02, 06). Surface sits lighter than the canvas with a hairline border + soft shadow.
const { interactive = false } = defineProps<{ interactive?: boolean }>()
</script>

<template>
  <div
    class="rounded-card border border-line bg-surface p-5 shadow-card"
    :class="interactive ? 'cursor-pointer transition-shadow hover:shadow-md' : ''"
  >
    <slot />
  </div>
</template>
